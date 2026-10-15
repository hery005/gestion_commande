from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Facture
from .serializers import FactureSerializer


class FactureViewSet(viewsets.ModelViewSet):
    queryset = Facture.objects.all().order_by('id_facture')
    serializer_class = FactureSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(cree_par=self.request.user)

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)
