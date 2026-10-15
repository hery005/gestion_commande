from django.urls import include
from rest_framework.routers import DefaultRouter
from .views import ProduitViewSet

router = DefaultRouter()
router.register(r'produits', ProduitViewSet, basename='produit')

urlpatterns = router.urls
