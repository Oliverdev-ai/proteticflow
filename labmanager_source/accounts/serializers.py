from rest_framework import serializers
from django.contrib.auth import authenticate
from django.contrib.auth.password_validation import validate_password
from .models import CustomUser


class UserSerializer(serializers.ModelSerializer):
    """Serializer para visualização de dados do usuário"""
    
    class Meta:
        model = CustomUser
        fields = [
            'id', 'username', 'email', 'first_name', 'last_name', 
            'role', 'phone', 'is_active', 'date_joined', 'last_login',
            'is_two_factor_enabled'
        ]
        read_only_fields = ['id', 'date_joined', 'last_login', 'is_two_factor_enabled']


class UserCreateSerializer(serializers.ModelSerializer):
    """Serializer para criação de novos usuários"""
    
    password = serializers.CharField(write_only=True, validators=[validate_password])
    password_confirm = serializers.CharField(write_only=True)
    
    class Meta:
        model = CustomUser
        fields = [
            'username', 'email', 'first_name', 'last_name',
            'role', 'phone', 'password', 'password_confirm'
        ]
    
    def validate(self, attrs):
        if attrs['password'] != attrs['password_confirm']:
            raise serializers.ValidationError("As senhas não coincidem.")
        return attrs
    
    def create(self, validated_data):
        validated_data.pop('password_confirm')
        password = validated_data.pop('password')
        user = CustomUser.objects.create_user(**validated_data)
        user.set_password(password)
        user.save()
        return user


class UserUpdateSerializer(serializers.ModelSerializer):
    """Serializer para atualização de dados do usuário"""
    
    class Meta:
        model = CustomUser
        fields = [
            'email', 'first_name', 'last_name', 'phone', 'is_active'
        ]
    
    def update(self, instance, validated_data):
        # Apenas admins podem alterar o status is_active
        request_user = self.context['request'].user
        if 'is_active' in validated_data and not request_user.is_admin():
            validated_data.pop('is_active')
        
        return super().update(instance, validated_data)


class LoginSerializer(serializers.Serializer):
    """Serializer para autenticação de usuários"""
    
    username = serializers.CharField()
    password = serializers.CharField(write_only=True)
    
    def validate(self, attrs):
        username = attrs.get('username')
        password = attrs.get('password')
        
        if username and password:
            user = authenticate(
                request=self.context.get('request'),
                username=username,
                password=password
            )
            
            if not user:
                raise serializers.ValidationError('Credenciais inválidas.')
            
            if not user.is_active:
                raise serializers.ValidationError('Conta desativada.')
            
            attrs['user'] = user
            return attrs
        
        raise serializers.ValidationError('Username e password são obrigatórios.')


class PasswordChangeSerializer(serializers.Serializer):
    """Serializer para alteração de senha"""
    
    old_password = serializers.CharField(write_only=True)
    new_password = serializers.CharField(write_only=True, validators=[validate_password])
    new_password_confirm = serializers.CharField(write_only=True)
    
    def validate_old_password(self, value):
        user = self.context['request'].user
        if not user.check_password(value):
            raise serializers.ValidationError('Senha atual incorreta.')
        return value
    
    def validate(self, attrs):
        if attrs['new_password'] != attrs['new_password_confirm']:
            raise serializers.ValidationError('As novas senhas não coincidem.')
        return attrs
    
    def save(self):
        user = self.context['request'].user
        user.set_password(self.validated_data['new_password'])
        user.save()
        return user

