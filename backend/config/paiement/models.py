from django.db import models
from facture.models import Facture
from django.conf import settings

class Paiement(models.Model):
    id_paiement = models.AutoField(primary_key=True)
    fk_id_facture = models.ForeignKey('facture.Facture', on_delete=models.CASCADE, null=False, blank=False, related_name='paiements')
    date_paiement = models.DateTimeField(auto_now_add=True)
    montant = models.DecimalField(max_digits=10, decimal_places=2, null=False, blank=False)
    mode_paiement = models.CharField(max_length=255, null=False, blank=False)
    reference_paiement = models.CharField(max_length=255, unique=True, null=False, blank=False)
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return f"Paiement {self.id_paiement} - Facture {self.fk_id_facture.id_facture}"