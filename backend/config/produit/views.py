from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django.db.models import Count, Q
from .models import Produit
from .serializers import ProduitSerializer


class ProduitViewSet(viewsets.ModelViewSet):
    queryset = Produit.objects.select_related('fk_id_fournisseur').all().order_by('id_produit')
    serializer_class = ProduitSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().filter(cree_par=self.request.user)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(nomProduit__icontains=search)
                | Q(codeProduit__icontains=search)
                | Q(description__icontains=search)
                | Q(fk_id_fournisseur__nomFournisseur__icontains=search)
                | Q(fk_id_fournisseur__prenomFournisseur__icontains=search)
                | Q(fk_id_fournisseur__raisonSociale__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)

    @action(detail=True, methods=['get'], url_path='fournisseurs-fiables')
    def fournisseurs_fiables(self, request, pk=None):
        from fournisseurs.models import Fournisseur
        from ligneCommande.models import LigneCommande

        orders = (
            LigneCommande.objects
            .filter(fk_id_produit_id=pk)
            .filter(fk_id_commande__cree_par=request.user)
            .values('fk_id_commande__fk_id_fournisseur_id')
            .annotate(
                total=Count('fk_id_commande', distinct=True),
                delivered=Count(
                    'fk_id_commande',
                    filter=Q(fk_id_commande__status='livree'),
                    distinct=True,
                ),
            )
        )
        supplier_stats = {
            row['fk_id_commande__fk_id_fournisseur_id']: row
            for row in orders
        }
        suppliers = Fournisseur.objects.filter(
            id_fournisseur__in=supplier_stats,
            cree_par=request.user,
        )
        results = []
        for supplier in suppliers:
            stats = supplier_stats[supplier.id_fournisseur]
            total = stats['total']
            delivered = stats['delivered']
            results.append({
                'id_fournisseur': supplier.id_fournisseur,
                'nom': supplier.raisonSociale or f'{supplier.prenomFournisseur} {supplier.nomFournisseur}'.strip(),
                'email': supplier.email,
                'commandes': total,
                'commandes_livrees': delivered,
                'taux_livraison': round(delivered * 100 / total, 1) if total else 0,
            })
        results.sort(key=lambda item: (-item['taux_livraison'], -item['commandes_livrees'], item['nom'].casefold()))
        return Response(results)
