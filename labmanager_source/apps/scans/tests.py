from django.test import TestCase
from django.contrib.auth import get_user_model
from django.core.files.uploadedfile import SimpleUploadedFile
from rest_framework.test import APIClient
from rest_framework import status
from apps.scans.xml_parser import parse_itero_xml

ITERO_XML_V50 = """<?xml version="1.0" encoding="utf-8"?>
<iTeroExport Version="5.0">
  <RxInfo>
    <OrderID>TEST001</OrderID>
    <OrderCode>TESTCODE</OrderCode>
    <Patient>Silva, João</Patient>
    <Doctor>Dr. Souza, Ana</Doctor>
    <DoctorLicense>12345</DoctorLicense>
    <DueDate>03/30/2026</DueDate>
    <ExportTime>03/14/2026 10:00:00</ExportTime>
    <PracticeShipToAddress>Rua Teste, 123</PracticeShipToAddress>
    <CaseTypeName>Invisalign</CaseTypeName>
  </RxInfo>
  <ExportedObjects>
    <Object ObjectType="Surface" SubType="Jaw" JawId="Upper" FileName="test_u.stl"/>
    <Object ObjectType="Surface" SubType="Jaw" JawId="Lower" FileName="test_l.stl"/>
  </ExportedObjects>
</iTeroExport>"""

class XMLParserTest(TestCase):
    def test_parse_itero_v50(self):
        result = parse_itero_xml(ITERO_XML_V50)
        self.assertEqual(result['order_id'], 'TEST001')
        self.assertEqual(result['patient_name'], 'Silva, João')
        self.assertEqual(result['doctor_name'], 'Dr. Souza, Ana')
        self.assertEqual(result['doctor_license'], '12345')
        self.assertIsNotNone(result['due_date'])
        self.assertEqual(len(result['exported_objects']), 2)

    def test_parse_invalid_xml(self):
        with self.assertRaises(ValueError):
            parse_itero_xml('<invalid>')

    def test_parse_missing_rxinfo(self):
        with self.assertRaises(ValueError):
            parse_itero_xml('<iTeroExport Version="5.0"></iTeroExport>')


class ScanUploadAPITest(TestCase):
    def setUp(self):
        from auditlog.registry import auditlog
        User = get_user_model()
        if auditlog.contains(User):
            auditlog.unregister(User)
            self._auditlog_user_registered = True
        else:
            self._auditlog_user_registered = False
        self.user = User.objects.create_user(
            username='gerente_test', password='pass123', role='gerente'
        )
        self.client_api = APIClient()
        self.client_api.force_authenticate(user=self.user)

    def tearDown(self):
        if getattr(self, '_auditlog_user_registered', False):
            from auditlog.registry import auditlog
            auditlog.register(get_user_model())

    def test_upload_missing_xml(self):
        response = self.client_api.post('/api/v1/scans/upload/', {}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_400_BAD_REQUEST)
        self.assertIn('error', response.data)

    def test_upload_valid_xml(self):
        xml_file = SimpleUploadedFile(
            'scan.xml', ITERO_XML_V50.encode('utf-8'), content_type='application/xml'
        )
        response = self.client_api.post(
            '/api/v1/scans/upload/',
            {'xml_file': xml_file},
            format='multipart'
        )
        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(response.data['order_id'], 'TEST001')
        self.assertEqual(response.data['patient_name'], 'Silva, João')

    def test_upload_duplicate_rejected(self):
        """Segundo upload do mesmo order_id deve retornar 409."""
        xml_file1 = SimpleUploadedFile(
            'scan1.xml', ITERO_XML_V50.encode('utf-8'), content_type='application/xml'
        )
        xml_file2 = SimpleUploadedFile(
            'scan2.xml', ITERO_XML_V50.encode('utf-8'), content_type='application/xml'
        )
        self.client_api.post('/api/v1/scans/upload/', {'xml_file': xml_file1}, format='multipart')
        response = self.client_api.post('/api/v1/scans/upload/', {'xml_file': xml_file2}, format='multipart')
        self.assertEqual(response.status_code, status.HTTP_409_CONFLICT)
