import csv
import io
from decimal import Decimal, InvalidOperation

from django.db import transaction
from rest_framework import permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from apps.employees.permissions import AnyRole, IsGerente
from .models import PriceTable, ServiceItem
from .serializers import (
    PriceTableDetailSerializer,
    PriceTableSerializer,
    ServiceItemSerializer,
)


class PriceTableViewSet(viewsets.ModelViewSet):
    queryset = PriceTable.objects.all().order_by("name")

    def get_permissions(self):
        if self.action in ["list", "retrieve", "export"]:
            return [AnyRole()]
        return [IsGerente()]

    def get_serializer_class(self):
        if self.action == "retrieve":
            return PriceTableDetailSerializer
        return PriceTableSerializer

    @action(detail=True, methods=["post"], url_path="reajuste")
    def reajuste(self, request, pk=None):
        """
        POST /api/v1/pricing/price-tables/{id}/reajuste/
        Body: {"percentual": 10.5}
        Aplica reajuste percentual em todos os ServiceItems ativos da tabela.
        """
        table = self.get_object()
        percentual = request.data.get("percentual")

        if percentual is None:
            return Response(
                {"error": 'Campo "percentual" é obrigatório.'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            fator = Decimal(str(percentual)) / Decimal("100")
        except InvalidOperation:
            return Response(
                {"error": "Valor de percentual inválido."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        items = ServiceItem.objects.filter(price_table=table, is_active=True)
        if not items.exists():
            return Response(
                {"error": "Nenhum item ativo encontrado nesta tabela."},
                status=status.HTTP_404_NOT_FOUND,
            )

        with transaction.atomic():
            for item in items:
                item.price = (item.price * (Decimal("1") + fator)).quantize(
                    Decimal("0.01")
                )
            ServiceItem.objects.bulk_update(items, ["price"])

        return Response(
            {
                "success": True,
                "message": f"Reajuste de {percentual}% aplicado em {items.count()} itens.",
                "tabela": table.name,
                "itens_atualizados": items.count(),
            }
        )

    @action(detail=True, methods=["get"], url_path="export")
    def export(self, request, pk=None):
        """
        GET /api/v1/pricing/price-tables/{id}/export/
        Exporta a tabela como CSV para o usuário editar e reimportar.
        """
        table = self.get_object()
        items = ServiceItem.objects.filter(price_table=table, is_active=True).order_by(
            "name"
        )

        output = io.StringIO()
        writer = csv.writer(output)
        writer.writerow(["name", "code", "description", "price"])
        for item in items:
            writer.writerow([item.name, item.code, item.description, item.price])

        response = Response(output.getvalue(), content_type="text/csv")
        response["Content-Disposition"] = (
            f'attachment; filename="tabela_{table.name}.csv"'
        )
        return response

    @action(detail=True, methods=["post"], url_path="import")
    def import_csv(self, request, pk=None):
        """
        POST /api/v1/pricing/price-tables/{id}/import/
        Recebe CSV com colunas: name, code (opcional), description (opcional), price
        Cria ou atualiza ServiceItems em lote (upsert por name).
        """
        table = self.get_object()

        arquivo = request.FILES.get("file")
        if not arquivo:
            return Response(
                {"error": 'Envie o arquivo CSV no campo "file".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if not arquivo.name.endswith(".csv"):
            return Response(
                {"error": "Apenas arquivos .csv são suportados."},
                status=status.HTTP_400_BAD_REQUEST,
            )

        try:
            decoded = arquivo.read().decode("utf-8-sig")
            reader = csv.DictReader(io.StringIO(decoded))
        except Exception as exc:
            return Response(
                {"error": f"Erro ao ler arquivo: {str(exc)}"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        if "name" not in reader.fieldnames or "price" not in reader.fieldnames:
            return Response(
                {"error": 'O CSV precisa ter as colunas "name" e "price".'},
                status=status.HTTP_400_BAD_REQUEST,
            )

        criados = 0
        atualizados = 0
        erros = []

        with transaction.atomic():
            for i, row in enumerate(reader, start=2):
                name = row.get("name", "").strip()
                price_raw = row.get("price", "").strip()

                if not name:
                    erros.append(f'Linha {i}: "name" vazio — ignorado.')
                    continue

                try:
                    price = Decimal(price_raw.replace(",", "."))
                except InvalidOperation:
                    erros.append(
                        f'Linha {i}: preço "{price_raw}" inválido — ignorado.'
                    )
                    continue

                item, created = ServiceItem.objects.update_or_create(
                    price_table=table,
                    name=name,
                    defaults={
                        "price": price,
                        "code": row.get("code", "").strip(),
                        "description": row.get("description", "").strip(),
                        "is_active": True,
                    },
                )

                if created:
                    criados += 1
                else:
                    atualizados += 1

        return Response(
            {
                "success": True,
                "tabela": table.name,
                "criados": criados,
                "atualizados": atualizados,
                "erros": erros,
                "total_processado": criados + atualizados,
            },
            status=status.HTTP_200_OK,
        )


class ServiceItemViewSet(viewsets.ModelViewSet):
    serializer_class = ServiceItemSerializer

    def get_permissions(self):
        if self.action in ["list", "retrieve"]:
            return [AnyRole()]
        return [IsGerente()]

    filterset_fields = ["price_table"]

    def get_queryset(self):
        queryset = ServiceItem.objects.filter(is_active=True).order_by("name")
        price_table_id = self.request.query_params.get("price_table")
        if price_table_id is not None:
            queryset = queryset.filter(price_table_id=price_table_id)
        return queryset
