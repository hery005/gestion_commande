from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated
from .models import Paiement
from .serializers import PaiementSerializer


class PaiementViewSet(viewsets.ModelViewSet):
    queryset = Paiement.objects.all().order_by('id_paiement')
    serializer_class = PaiementSerializer
    permission_classes = [IsAuthenticated]

    def get_queryset(self):
        return super().get_queryset().filter(cree_par=self.request.user)

    def perform_create(self, serializer):
        serializer.save(cree_par=self.request.user)
