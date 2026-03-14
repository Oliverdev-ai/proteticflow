"""
Parser para arquivos de export do iTero (v3.0 e v5.0).
Extende facilmente para outros scanners (Medit, 3Shape).
"""
import xml.etree.ElementTree as ET
from datetime import datetime


def parse_itero_xml(xml_content: str) -> dict:
    """
    Parseia o XML de export do iTero (versões 3.0 e 5.0).
    Retorna dict com todos os metadados extraídos.
    """
    try:
        root = ET.fromstring(xml_content)
    except ET.ParseError as e:
        raise ValueError(f'XML inválido: {e}')

    version = root.get('Version', 'unknown')
    rx = root.find('RxInfo')
    if rx is None:
        raise ValueError('Elemento RxInfo não encontrado no XML')

    def get(tag, default=''):
        el = rx.find(tag)
        return el.text.strip() if el is not None and el.text else default

    # Exportados (STL, imagens)
    exported = []
    for obj in root.findall('.//ExportedObjects/Object'):
        exported.append({
            'type':     obj.get('ObjectType', ''),
            'subtype':  obj.get('SubType', ''),
            'jaw_id':   obj.get('JawId', ''),
            'filename': obj.get('FileName', ''),
        })

    # Dentes escaneados (v5.0)
    scan_range = {}
    upper = root.find('.//ScanRange/UpperRange')
    lower = root.find('.//ScanRange/LowerRange')
    if upper is not None:
        scan_range['upper'] = {'from': upper.get('FromAdaId'), 'to': upper.get('ToAdaId')}
    if lower is not None:
        scan_range['lower'] = {'from': lower.get('FromAdaId'), 'to': lower.get('ToAdaId')}

    # Parse de datas
    def parse_date(s):
        for fmt in ('%m/%d/%Y', '%d/%m/%Y', '%Y-%m-%d'):
            try:
                return datetime.strptime(s, fmt).date()
            except (ValueError, TypeError):
                continue
        return None

    # Procedure lookup (v5.0 tem RxDefines, v3.0 tem CaseTypeName)
    procedure = get('CaseTypeName') or ''
    if not procedure:
        proc_el = root.find('.//RxDefines/Procedure/Type')
        if proc_el is not None:
            procedure = proc_el.get('Name', '')

    return {
        'version':        version,
        'order_id':       get('OrderID'),
        'order_code':     get('OrderCode'),
        'patient_name':   get('Patient'),
        'doctor_name':    get('Doctor'),
        'doctor_license': get('DoctorLicense'),
        'doctor_id':      get('DoctorID'),
        'procedure':      procedure,
        'ship_to_address': get('PracticeShipToAddress'),
        'due_date':       parse_date(get('DueDate')),
        'scan_date':      parse_date(get('ExportTime')),
        'exported_objects': exported,
        'scan_range':     scan_range,
        'raw': {  # dump completo para raw_metadata
            'version': version,
            'rx_info': {tag.tag: tag.text for tag in rx},
            'exported_objects': exported,
        }
    }
