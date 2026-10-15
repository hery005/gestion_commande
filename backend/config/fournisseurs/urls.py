from django.urls import include
from rest_framework.routers import DefaultRouter
from .views import FournisseurViewSet

router = DefaultRouter()
router.register(r'fournisseurs', FournisseurViewSet, basename='fournisseur')

urlpatterns = router.urls
