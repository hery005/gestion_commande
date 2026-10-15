from rest_framework import serializers
from .models import Fournisseur


class FournisseurSerializer(serializers.ModelSerializer):
    class Meta:
        model = Fournisseur
        fields = '__all__'
        read_only_fields = ('cree_par',)

    def validate(self, attrs):
        attrs = super().validate(attrs)
        for field in ('nomFournisseur', 'prenomFournisseur', 'raisonSociale', 'posteFournisseur', 'telephone', 'adresse'):
            if field in attrs and isinstance(attrs[field], str):
                attrs[field] = attrs[field].strip()
        email = attrs.get('email')
        if email is not None:
            email = email.strip().lower()
            request = self.context.get('request')
            if request and request.user.is_authenticated:
                existing = Fournisseur.objects.filter(cree_par=request.user, email__iexact=email)
                if self.instance:
                    existing = existing.exclude(pk=self.instance.pk)
                if existing.exists():
                    raise serializers.ValidationError({'email': 'Un fournisseur avec cet e-mail existe déjà dans votre espace.'})
            attrs['email'] = email
        for field in ('nomFournisseur', 'prenomFournisseur', 'raisonSociale'):
            if field in attrs and not attrs[field]:
                raise serializers.ValidationError({field: 'Ce champ ne peut pas être vide.'})
        return attrs
