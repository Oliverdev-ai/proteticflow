try:
    from lxml import etree
except ImportError:
    etree = None

def parse_nfe_xml(xml_file):
    """
    Realiza o parse básico de uma NF-e (XML) para extração de dados.
    Requer a biblioteca lxml.
    """
    if etree is None:
        raise NotImplementedError(
            "O suporte a parsing de NF-e requer a biblioteca 'lxml'. "
            "Por favor, instale-a via 'pip install lxml'."
        )

    try:
        # Carrega o XML (pode ser um path ou um objeto file-like)
        tree = etree.parse(xml_file)
        root = tree.getroot()
        
        # O namespace padrão da NF-e costuma ser http://www.portalfiscal.inf.br/nfe
        ns = {"nfe": root.nsmap.get(None)} if root.nsmap.get(None) else {}
        
        # Helper para buscar campos com namespace opcional
        def get_text(path):
            element = root.find(path, ns)
            return element.text if element is not None else None

        # Extração de campos básicos conforme Roadmap v2.0
        data = {
            "numero": get_text(".//nfe:ide/nfe:nNF"),
            "data_emissao": get_text(".//nfe:ide/nfe:dhEmi"),
            "emitente_cnpj": get_text(".//nfe:emit/nfe:CNPJ"),
            "emitente_nome": get_text(".//nfe:emit/nfe:xNome"),
            "valor_total": get_text(".//nfe:total/nfe:ICMSTot/nfe:vNF"),
            "status": "sucesso"
        }
        
        return data

    except Exception as e:
        return {
            "status": "erro",
            "mensagem": f"Erro ao processar XML da NF-e: {str(e)}"
        }
