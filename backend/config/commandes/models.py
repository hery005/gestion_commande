from django.db import models
from fournisseurs.models import Fournisseur
from django.conf import settings 
# Create your models here.
class Commande(models.Model):
    class Status(models.TextChoices):
        ENVOYE = 'envoye', 'Envoyée'
        CONFIRME = 'confirme', 'Confirmée'
        ANNULEE = 'annulee', 'Annulée'
        LIVREE = 'livree', 'Livrée'
        EN_ATTENTE = 'en_attente', 'En attente'
        
    id_commande = models.AutoField(primary_key=True)
    reference = models.CharField(max_length=255, unique=True, null=False, blank=False)
    dateCommande = models.DateTimeField(auto_now_add=True)
    status = models.CharField(max_length=20, choices=Status.choices, default=Status.EN_ATTENTE)
    fk_id_fournisseur = models.ForeignKey('fournisseurs.Fournisseur', on_delete=models.CASCADE, null=False, blank=False, related_name='commandes')
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Commande {self.id_commande} - {self.reference}"