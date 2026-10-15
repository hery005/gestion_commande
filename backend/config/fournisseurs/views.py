from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Fournisseur
from .serializers import FournisseurSerializer


class FournisseurViewSet(viewsets.ModelViewSet):
    queryset = Fournisseur.objects.all().order_by('id_fournisseur')
    serializer_class = FournisseurSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(cree_par=self.request.user)

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)
