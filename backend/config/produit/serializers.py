from rest_framework import serializers
from fournisseurs.models import Fournisseur
from .models import Produit


class ProduitSerializer(serializers.ModelSerializer):
    codeProduit = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = Produit
        fields = '__all__'
        read_only_fields = ('codeProduit', 'cree_par')

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            fields['fk_id_fournisseur'].queryset = Fournisseur.objects.filter(cree_par=request.user)
        return fields

    def validate(self, attrs):
        attrs = super().validate(attrs)
        if 'nomProduit' in attrs:
            attrs['nomProduit'] = attrs['nomProduit'].strip()
            if not attrs['nomProduit']:
                raise serializers.ValidationError({'nomProduit': 'Le nom du produit ne peut pas être vide.'})
        if attrs.get('prixUnitaire', getattr(self.instance, 'prixUnitaire', 0)) < 0:
            raise serializers.ValidationError({'prixUnitaire': 'Le prix ne peut pas être négatif.'})
        if attrs.get('quantiteStock', getattr(self.instance, 'quantiteStock', 0)) < 0:
            raise serializers.ValidationError({'quantiteStock': 'Le stock ne peut pas être négatif.'})
        return attrs
