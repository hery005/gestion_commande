from django.db import models
from django.conf import settings
# Create your models here.
class Fournisseur(models.Model):
    id_fournisseur = models.AutoField(primary_key=True)
    nomFournisseur = models.CharField(max_length=255, null=False, blank=False)
    prenomFournisseur = models.CharField(max_length=255, null=False, blank=False)
    posteFournisseur = models.CharField(max_length=255, null=True, blank=True)
    raisonSociale = models.CharField(max_length=255, null=False, blank=False)
    email = models.EmailField(null=False, blank=False)
    telephone = models.CharField(max_length=20, null=True, blank=True)
    adresse = models.CharField(max_length=255, null=True, blank=True)
    date_creation = models.DateTimeField(auto_now_add=True)
    date_modification = models.DateTimeField(auto_now=True)
    cree_par = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.PROTECT, null=True, blank=True)

    def __str__(self):
        return self.nomFournisseur+" "+self.prenomFournisseur

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=['cree_par', 'email'],
                name='unique_fournisseur_email_per_owner',
            ),
        ]