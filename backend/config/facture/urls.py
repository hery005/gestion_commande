from django.urls import include
from rest_framework.routers import DefaultRouter
from .views import FactureViewSet

router = DefaultRouter()
router.register(r'factures', FactureViewSet, basename='facture')

urlpatterns = router.urls
