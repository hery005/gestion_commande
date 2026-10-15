from django.urls import path, include

urlpatterns = [
    path('', include('utilisateurs.urls')),
    path('', include('fournisseurs.urls')),
    path('', include('commandes.urls')),
    path('', include('produit.urls')),
    path('', include('facture.urls')),
    path('', include('paiement.urls')),
]