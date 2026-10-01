from django.db import models
from commandes.models import Commande
from django.conf import settings

# Create your models here.
class Facture(models.Model):
    id_facture = models.AutoField(primary_key=True)
    fk_id_commande = models.ForeignKey('commandes.Commande', on_delete=models.CASCADE, null=False, blank=False, related_name='factures')
    date_facture = models.DateTimeField(auto_now_add=True)
    montant_total = models.DecimalField(max_digits=10, decimal_places=2, null=False, blank=False)
    reference_facture = models.CharField(max_length=255, unique=True, null=False, blank=False)
    date_echeance = models.DateTimeField(null=True, blank=True)
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Facture {self.id_facture} - Commande {self.fk_id_commande.id_commande}"