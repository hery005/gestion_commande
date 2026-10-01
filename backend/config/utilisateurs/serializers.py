from rest_framework import serializers
from .models import Utilisateurs

class UtilisateurSerialize(serializers.ModelSerializer):
    password = serializers.CharField(write_only=True)
    class Meta:
        model = Utilisateurs
        fields = '__all__'
        read_only_fields= ['id_utilisateur']
        
    def create_user(self, validated_data):
        return Utilisateurs.objects.create_user(**validated_data)
    
    def create(self, validated_data):
        return self.create_user(validated_data)
    
    def update(self, instance, validated_data):
        for attr, value in validated_data.items():
            if attr == 'password':
                instance.set_password(value)
            else:
                setattr(instance, attr, value)
        instance.save()
        return instance