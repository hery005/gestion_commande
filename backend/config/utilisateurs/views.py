from rest_framework.response import Response
from rest_framework import status
from rest_framework.decorators import action
from .serializers import UserRegistrationSerializer, UtilisateurSerialize
from .models import Utilisateurs
from rest_framework import viewsets
from rest_framework.permissions import IsAuthenticated, AllowAny
from rest_framework_simplejwt.serializers import TokenObtainPairSerializer
from rest_framework_simplejwt.views import TokenObtainPairView

class IsAdministrator(IsAuthenticated):
    def has_permission(self, request, view):
        return super().has_permission(request, view) and (
            request.user.is_superuser or request.user.role == 'Admin'
        )


class CustomTokenObtainPairSerializer(TokenObtainPairSerializer):
    @classmethod
    def get_token(cls, user):
        token = super().get_token(user)
        token['role'] = user.role
        token['email'] = user.email
        token['first_name'] = user.prenomUtilisateur
        token['last_name'] = user.nomUtilisateur
        return token


class CustomTokenObtainPairView(TokenObtainPairView):
    serializer_class = CustomTokenObtainPairSerializer


class UtilisateurViewSet(viewsets.ModelViewSet):
    queryset = Utilisateurs.objects.all()
    serializer_class = UtilisateurSerialize
    permission_classes = [IsAuthenticated]

    def get_permissions(self):
        if self.action == 'register':
            return [AllowAny()]
        if self.action == 'create' or self.action in {'update', 'partial_update', 'destroy'}:
            return [IsAdministrator()]
        return super().get_permissions()

    def get_authenticators(self):
        if self.action_map.get(self.request.method.lower()) == 'register':
            return []
        return super().get_authenticators()

    def get_serializer_class(self):
        if self.action == 'register':
            return UserRegistrationSerializer
        return super().get_serializer_class()

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[], serializer_class=UserRegistrationSerializer)
    def register(self, request):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(serializer.data, status=status.HTTP_201_CREATED)

    def get_queryset(self):
        queryset = Utilisateurs.objects.all().order_by('id_utilisateur')
        if self.request.user.is_superuser or self.request.user.role == 'Admin':
            return queryset
        return queryset.filter(pk=self.request.user.pk)

    def destroy(self, request, *args, **kwargs):
        instance = self.get_object()
        self.perform_destroy(instance)
        return Response(status=status.HTTP_204_NO_CONTENT)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop('partial', False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        self.perform_update(serializer)
        return Response(serializer.data)

    @action(detail=False, methods=['post'], permission_classes=[AllowAny], authentication_classes=[])
    def login(self, request):
        serializer = CustomTokenObtainPairSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        return Response(serializer.validated_data, status=status.HTTP_200_OK)
