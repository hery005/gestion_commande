from django.db import models
from fournisseurs.models import Fournisseur
from django.conf import settings
# Create your models here.
class Produit(models.Model):
    id_produit = models.AutoField(primary_key=True)
    nomProduit = models.CharField(max_length=255, null=False, blank=False)
    description = models.TextField(null=True, blank=True)
    prixUnitaire = models.DecimalField(max_digits=10, decimal_places=2, null=False, blank=False)
    codeProduit = models.CharField(max_length=100, unique=True, null=False, blank=False)
    quantiteStock = models.DecimalField(max_digits=10, decimal_places=2, null=False, blank=False)
    fk_id_fournisseur = models.ForeignKey('fournisseurs.Fournisseur', on_delete=models.CASCADE, null=False, blank=False, related_name='produits')
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)

    def __str__(self):
        return self.nomProduit