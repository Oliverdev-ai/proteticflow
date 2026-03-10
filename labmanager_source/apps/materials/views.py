from rest_framework import viewsets, status, filters
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import IsAuthenticated
from django_filters.rest_framework import DjangoFilterBackend
from django.db import transaction, models
from django.http import HttpResponse
import xml.etree.ElementTree as ET
import json
import datetime
from rest_framework.views import APIView
from rest_framework.exceptions import ValidationError

from .models import (
    Supplier, 
    MaterialCategory, 
    Material, 
    StockMovement, 
    PurchaseOrder, 
    PurchaseOrderItem
)
from .serializers import (
    SupplierSerializer,
    MaterialCategorySerializer,
    MaterialSerializer,
    StockMovementSerializer,
    PurchaseOrderSerializer,
    PurchaseOrderItemSerializer
)
from .filters import MaterialFilter, StockMovementFilter, PurchaseOrderFilter
from .xml_parser import parse_nfe_xml
from core.utils.errors import error_response, log_and_response


class SupplierViewSet(viewsets.ModelViewSet):
    """
    API endpoint for suppliers.
    """
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'document_number', 'contact_person']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class MaterialCategoryViewSet(viewsets.ModelViewSet):
    """
    API endpoint for material categories.
    """
    queryset = MaterialCategory.objects.all()
    serializer_class = MaterialCategorySerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name']
    ordering_fields = ['name']
    ordering = ['name']


class MaterialViewSet(viewsets.ModelViewSet):
    """
    API endpoint for materials.
    """
    queryset = Material.objects.all()
    serializer_class = MaterialSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = MaterialFilter
    search_fields = ['name', 'code', 'barcode']
    ordering_fields = ['name', 'code', 'current_stock', 'category__name']
    ordering = ['name']

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Return materials with stock below minimum."""
        materials = Material.objects.filter(current_stock__lt=models.F('minimum_stock'))
        serializer = self.get_serializer(materials, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['get'])
    def movements(self, request, pk=None):
        """Return stock movements for a specific material."""
        material = self.get_object()
        movements = material.movements.all().order_by('-created_at')
        serializer = StockMovementSerializer(movements, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def scan_barcode(self, request, pk=None):
        """Handle barcode scanning for this material."""
        material = self.get_object()
        
        # Get movement type and quantity from request
        movement_type = request.data.get('movement_type', 'OUT')
        quantity = request.data.get('quantity', 1)
        notes = request.data.get('notes', '')
        
        try:
            quantity = float(quantity)
            
            # Create stock movement
            movement = StockMovement.objects.create(
                material=material,
                movement_type=movement_type,
                quantity=quantity,
                unit_price=material.average_cost,
                total_price=material.average_cost * quantity,
                reference="Barcode Scan",
                notes=notes
            )
            
            serializer = StockMovementSerializer(movement)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
        except ValueError:
            return Response(
                {"error": "Invalid quantity value"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class StockMovementViewSet(viewsets.ModelViewSet):
    """
    API endpoint for stock movements.
    """
    queryset = StockMovement.objects.all()
    serializer_class = StockMovementSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = StockMovementFilter
    search_fields = ['material__name', 'material__code', 'reference', 'notes']
    ordering_fields = ['created_at', 'material__name', 'quantity', 'movement_type']
    ordering = ['-created_at']


class PurchaseOrderViewSet(viewsets.ModelViewSet):
    """
    API endpoint for purchase orders.
    """
    queryset = PurchaseOrder.objects.all()
    serializer_class = PurchaseOrderSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PurchaseOrderFilter
    search_fields = ['order_number', 'supplier__name', 'invoice_number', 'notes']
    ordering_fields = ['order_date', 'expected_delivery_date', 'status', 'total_amount']
    ordering = ['-order_date']

    @action(detail=True, methods=['post'])
    def receive(self, request, pk=None):
        """Mark purchase order as received and create stock movements."""
        purchase_order = self.get_object()
        
        if purchase_order.status == PurchaseOrder.Status.RECEIVED:
            return Response(
                {"error": "Purchase order already received"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        if purchase_order.status == PurchaseOrder.Status.CANCELLED:
            return Response(
                {"error": "Cannot receive a cancelled purchase order"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        # Get delivery date from request or use today
        delivery_date = request.data.get('delivery_date', None)
        if not delivery_date:
            delivery_date = datetime.date.today()
        
        # Get invoice number from request
        invoice_number = request.data.get('invoice_number', '')
        
        with transaction.atomic():
            # Update purchase order
            purchase_order.status = PurchaseOrder.Status.RECEIVED
            purchase_order.delivery_date = delivery_date
            purchase_order.invoice_number = invoice_number
            purchase_order.save()
            
            # Create stock movements for each item
            for item in purchase_order.items.all():
                # Use received_quantity if specified, otherwise use ordered quantity
                quantity = item.received_quantity if item.received_quantity > 0 else item.quantity
                
                StockMovement.objects.create(
                    material=item.material,
                    movement_type=StockMovement.MovementType.IN,
                    quantity=quantity,
                    unit_price=item.unit_price,
                    total_price=item.unit_price * quantity,
                    reference=f"PO #{purchase_order.order_number}",
                    notes=f"Invoice: {invoice_number}",
                    supplier=purchase_order.supplier
                )
                
                # Update received quantity
                item.received_quantity = quantity
                item.save()
        
        serializer = self.get_serializer(purchase_order)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel purchase order."""
        purchase_order = self.get_object()
        
        if purchase_order.status == PurchaseOrder.Status.RECEIVED:
            return Response(
                {"error": "Cannot cancel a received purchase order"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        purchase_order.status = PurchaseOrder.Status.CANCELLED
        purchase_order.save()
        
        serializer = self.get_serializer(purchase_order)
        return Response(serializer.data)

    @action(detail=False, methods=['post'])
    def import_xml(self, request):
        """Import purchase order from XML file."""
        xml_file = request.FILES.get('xml_file')
        if not xml_file:
            return Response(
                {"error": "No XML file provided"}, 
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            # Parse XML file
            parsed_data = parse_nfe_xml(xml_file)
            
            with transaction.atomic():
                # Create or get supplier
                supplier, created = Supplier.objects.get_or_create(
                    document_number=parsed_data['supplier_cnpj'],
                    defaults={
                        'name': parsed_data['supplier_name'],
                        'email': parsed_data.get('supplier_email', ''),
                        'phone': parsed_data.get('supplier_phone', '')
                    }
                )
                
                # Create purchase order
                purchase_order = PurchaseOrder.objects.create(
                    order_number=f"XML-{parsed_data['nfe_number']}",
                    supplier=supplier,
                    status=PurchaseOrder.Status.RECEIVED,
                    order_date=parsed_data['issue_date'],
                    delivery_date=parsed_data['issue_date'],
                    invoice_number=parsed_data['nfe_number'],
                    notes=f"Imported from XML: {parsed_data['nfe_key']}",
                    total_amount=parsed_data['total_amount']
                )
                
                # Save XML file
                purchase_order.invoice_xml = xml_file
                purchase_order.save()
                
                # Create purchase order items and stock movements
                for item_data in parsed_data['items']:
                    # Try to find material by code or create new one
                    material, created = Material.objects.get_or_create(
                        code=item_data['code'],
                        defaults={
                            'name': item_data['description'],
                            'unit': item_data['unit'],
                            'barcode': item_data.get('ean', '')
                        }
                    )
                    
                    # Create purchase order item
                    po_item = PurchaseOrderItem.objects.create(
                        purchase_order=purchase_order,
                        material=material,
                        quantity=item_data['quantity'],
                        unit_price=item_data['unit_price'],
                        total_price=item_data['total_price'],
                        received_quantity=item_data['quantity']
                    )
                    
                    # Create stock movement
                    StockMovement.objects.create(
                        material=material,
                        movement_type=StockMovement.MovementType.IN,
                        quantity=item_data['quantity'],
                        unit_price=item_data['unit_price'],
                        total_price=item_data['total_price'],
                        reference=f"XML Import: {parsed_data['nfe_number']}",
                        supplier=supplier
                    )
            
            serializer = self.get_serializer(purchase_order)
            return Response(serializer.data, status=status.HTTP_201_CREATED)
            
        except Exception as e:
            return Response(
                {"error": f"Error parsing XML: {str(e)}"}, 
                status=status.HTTP_400_BAD_REQUEST
            )


class PurchaseOrderItemViewSet(viewsets.ModelViewSet):
    """
    API endpoint for purchase order items.
    """
    queryset = PurchaseOrderItem.objects.all()
    serializer_class = PurchaseOrderItemSerializer
    permission_classes = [IsAuthenticated]
    filter_backends = [DjangoFilterBackend, filters.SearchFilter]
    filterset_fields = ['purchase_order', 'material']
    search_fields = ['material__name', 'material__code']


class InvoiceUploadView(APIView):
    permission_classes = [IsAuthenticated]
    def post(self, request):
        try:
            # lógica de upload
            ...
        except ValidationError as e:
            return error_response('Erro de validação: ' + str(e))
        except Exception as e:
            return log_and_response('Erro inesperado ao fazer upload de XML.', exc=e)
