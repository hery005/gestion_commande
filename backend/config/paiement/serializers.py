from rest_framework import serializers
from facture.models import Facture
from .models import Paiement


class PaiementSerializer(serializers.ModelSerializer):
    reference_paiement = serializers.CharField(read_only=True, required=False)

    class Meta:
        model = Paiement
        fields = '__all__'
        read_only_fields = ('reference_paiement', 'cree_par')

    def get_fields(self):
        fields = super().get_fields()
        request = self.context.get('request')
        if request and request.user.is_authenticated:
            fields['fk_id_facture'].queryset = Facture.objects.filter(cree_par=request.user)
        return fields

    def validate_montant(self, value):
        if value <= 0:
            raise serializers.ValidationError('Le montant doit être supérieur à zéro.')
        return value

    def validate_mode_paiement(self, value):
        allowed_modes = {'Virement', 'Carte bancaire', 'Prélèvement', 'Espèces'}
        if value not in allowed_modes:
            raise serializers.ValidationError('Sélectionnez un mode de paiement valide.')
        return value
