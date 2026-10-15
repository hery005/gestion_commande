from decimal import Decimal
from rest_framework import serializers
from django.db import transaction
from fournisseurs.models import Fournisseur
from ligneCommande.models import LigneCommande
from produit.models import Produit
from .models import Commande


class CommandeLineInputSerializer(serializers.Serializer):
    id_produit = serializers.PrimaryKeyRelatedField(queryset=Produit.objects.all())
    quantite = serializers.DecimalField(max_digits=10, decimal_places=2, min_value=Decimal('0.01'))


class CommandeSerializer(serializers.ModelSerializer):
    panier = CommandeLineInputSerializer(many=True, write_only=True, required=True)
    total = serializers.SerializerMethodField()
    reference = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = Commande
        fields = '__all__'
        read_only_fields = ('reference', 'cree_par')

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            fields['fk_id_fournisseur'].queryset = Fournisseur.objects.filter(cree_par=request.user)
            fields['panier'].child.fields['id_produit'].queryset = Produit.objects.filter(cree_par=request.user)
        return fields

    def get_total(self, commande):
        return sum(
            (ligne.quantite * ligne.prix for ligne in commande.lignes_commandes.all()),
            Decimal('0'),
        )

    def validate_panier(self, panier):
        if not panier:
            raise serializers.ValidationError('Ajoutez au moins un produit à la commande.')
        return panier

    def validate(self, attrs):
        attrs = super().validate(attrs)
        status_value = attrs.get('status')
        if status_value and status_value not in Commande.Status.values:
            raise serializers.ValidationError({'status': 'Sélectionnez un statut de commande valide.'})
        return attrs

    @transaction.atomic
    def create(self, validated_data):
        panier = validated_data.pop('panier', [])
        commande = Commande.objects.create(**validated_data)
        LigneCommande.objects.bulk_create([
            LigneCommande(
                fk_id_commande=commande,
                fk_id_produit=line['id_produit'],
                quantite=line['quantite'],
                prix=line['id_produit'].prixUnitaire,
            )
            for line in panier
        ])
        return commande
