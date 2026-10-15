from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from django.db.models import Q
from .models import Commande
from .serializers import CommandeSerializer


class CommandeViewSet(viewsets.ModelViewSet):
    queryset = (
        Commande.objects
        .select_related('fk_id_fournisseur')
        .prefetch_related('lignes_commandes')
        .all()
        .order_by('-dateCommande', '-id_commande')
    )
    serializer_class = CommandeSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        queryset = super().get_queryset().filter(cree_par=self.request.user)
        search = self.request.query_params.get('search', '').strip()
        if search:
            queryset = queryset.filter(
                Q(reference__icontains=search)
                | Q(status__icontains=search)
                | Q(fk_id_fournisseur__nomFournisseur__icontains=search)
                | Q(fk_id_fournisseur__prenomFournisseur__icontains=search)
                | Q(fk_id_fournisseur__raisonSociale__icontains=search)
            )
        return queryset

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)
