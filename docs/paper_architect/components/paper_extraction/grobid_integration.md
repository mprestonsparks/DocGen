# GROBID Integration Guide

## Overview

GROBID (GeneRation Of BIbliographic Data) is a machine learning library for extracting and parsing scientific documents from PDFs into structured XML/TEI encoded documents. This guide describes how to integrate GROBID into the DocGen `paper_architect` module.

## Key Benefits

- **Lightweight Processing**: Processes papers in seconds (vs. minutes with OCR)
- **Structured Output**: Produces well-formed XML following TEI standards
- **Detailed Extraction**: Captures headers, references, citation contexts, and full text
- **Coordinate Mapping**: Preserves PDF coordinates for extracted information
- **RESTful Architecture**: Can be run locally or as a remote service

## Installation

### Option 1: Docker (Recommended)

```bash
# Pull the official GROBID Docker image
docker pull grobid/grobid:0.7.2

# Run GROBID as a service
docker run -t --rm -p 8070:8070 grobid/grobid:0.7.2
```

### Option 2: Manual Installation

```bash
# Clone the GROBID repository
git clone https://github.com/kermitt2/grobid.git

# Navigate to the directory
cd grobid

# Build with Gradle
./gradlew clean install

# Run the service
./gradlew run
```

## Python Client Configuration

Create a GROBID client in Python to interact with the service:

```python
import requests
import json
import os

class GrobidClient:
    def __init__(self, base_url="http://localhost:8070/api"):
        self.base_url = base_url
        
    def process_pdf(self, pdf_path, output_path=None):
        """Process a PDF file with GROBID and return the TEI XML"""
        if not os.path.isfile(pdf_path):
            raise FileNotFoundError(f"PDF file not found: {pdf_path}")
            
        url = f"{self.base_url}/processFulltextDocument"
        
        with open(pdf_path, 'rb') as pdf_file:
            files = {'input': (os.path.basename(pdf_path), pdf_file, 'application/pdf')}
            response = requests.post(url, files=files)
            
        if response.status_code != 200:
            raise Exception(f"GROBID API error: {response.status_code}")
            
        if output_path:
            with open(output_path, 'w', encoding='utf8') as output_file:
                output_file.write(response.text)
                
        return response.text
```

## Processing Pipeline

1. **Input Validation**: Verify the PDF exists and is readable
2. **GROBID Processing**: Send the PDF to GROBID for processing
3. **XML Parsing**: Parse the TEI XML output
4. **Structure Extraction**: Extract specific elements (header, body, references)
5. **JSON Conversion**: Convert to JSON format for further processing

## Example Usage

```python
from docgen.paper_architect.components.paper_extraction.grobid_integration import GrobidClient

# Initialize the client
client = GrobidClient()

# Process a PDF document
tei_xml = client.process_pdf("path/to/paper.pdf", "output/paper.tei.xml")

# Convert to JSON format
from docgen.paper_architect.components.paper_extraction.tei_to_json import tei_to_json
paper_json = tei_to_json(tei_xml, "output/paper.json")

print(f"Processed paper with {len(paper_json['sections'])} sections and {len(paper_json['references'])} references")
```

## Extracted Information

GROBID extracts the following key elements:

- **Header Information**: Title, authors, affiliations, abstract
- **Body Content**: Sections, paragraphs, figures, tables
- **References**: Bibliographic entries formatted as structured data
- **Citations**: In-text citations linked to references
- **Equations**: Mathematical expressions (with limitations)

## Handling GROBID Limitations

GROBID may struggle with certain document elements:

1. **Complex Equations**: Use supplementary extraction for mathematical content
2. **Algorithms**: Implement custom extraction for algorithm blocks
3. **Tables**: May require manual verification and correction
4. **Special Characters**: Unicode handling may need additional processing

## Converting TEI XML to JSON

The `tei_to_json` function converts GROBID's TEI XML output to a more usable JSON format:

```python
import xml.etree.ElementTree as ET
import json

def tei_to_json(tei_xml, output_path=None):
    """Convert TEI XML to JSON structure"""
    # Parse the XML
    root = ET.fromstring(tei_xml)
    
    # Extract namespaces
    namespaces = {'tei': 'http://www.tei-c.org/ns/1.0'}
    
    # Create the basic structure
    paper_json = {
        'header': {},
        'sections': [],
        'references': []
    }
    
    # Extract header information
    header = root.find('.//tei:teiHeader', namespaces)
    if header is not None:
        title_element = header.find('.//tei:title', namespaces)
        if title_element is not None:
            paper_json['header']['title'] = title_element.text
        
        # Extract authors
        paper_json['header']['authors'] = []
        for author in header.findall('.//tei:author', namespaces):
            author_data = {
                'firstname': author.find('.//tei:forename', namespaces).text if author.find('.//tei:forename', namespaces) is not None else '',
                'lastname': author.find('.//tei:surname', namespaces).text if author.find('.//tei:surname', namespaces) is not None else ''
            }
            paper_json['header']['authors'].append(author_data)
    
    # Extract body sections
    body = root.find('.//tei:body', namespaces)
    if body is not None:
        for div in body.findall('.//tei:div', namespaces):
            section = {
                'title': '',
                'content': []
            }
            
            # Get section title
            head = div.find('./tei:head', namespaces)
            if head is not None:
                section['title'] = head.text
            
            # Get paragraphs
            for p in div.findall('./tei:p', namespaces):
                section['content'].append(ET.tostring(p, encoding='unicode'))
            
            paper_json['sections'].append(section)
    
    # Extract references
    back = root.find('.//tei:back', namespaces)
    if back is not None:
        for biblStruct in back.findall('.//tei:biblStruct', namespaces):
            ref = {
                'id': biblStruct.get('{http://www.w3.org/XML/1998/namespace}id', ''),
                'title': '',
                'authors': [],
                'venue': '',
                'year': ''
            }
            
            # Extract reference details
            title = biblStruct.find('.//tei:title', namespaces)
            if title is not None:
                ref['title'] = title.text
            
            # Extract authors
            for author in biblStruct.findall('.//tei:author', namespaces):
                author_name = ''
                forename = author.find('.//tei:forename', namespaces)
                surname = author.find('.//tei:surname', namespaces)
                
                if forename is not None:
                    author_name += forename.text + ' '
                if surname is not None:
                    author_name += surname.text
                
                ref['authors'].append(author_name.strip())
            
            # Extract year
            date = biblStruct.find('.//tei:date', namespaces)
            if date is not None:
                ref['year'] = date.get('when', '')
            
            paper_json['references'].append(ref)
    
    # Save to file if output_path is provided
    if output_path:
        with open(output_path, 'w', encoding='utf8') as f:
            json.dump(paper_json, f, indent=2)
    
    return paper_json
```

## Advanced Configuration

GROBID offers several configuration options for specialized extraction:

- **Consolidation**: Enhanced reference parsing using external services
- **PDF Coordinates**: Extraction of position information
- **Citation Styling**: Format citation data according to specific styles

Refer to the [GROBID documentation](https://grobid.readthedocs.io/) for advanced configuration options.

## Integration with DocGen

The GROBID integration component serves as the first stage in the academic paper implementation pipeline, feeding structured data to the knowledge modeling system. The architecture maintains clear separation of concerns:

- **Paper Extraction**: Responsibility of the GROBID integration
- **Knowledge Modeling**: Consumes structured paper data
- **Specification Generation**: Uses the knowledge model to create documentation

## Error Handling and Logging

Implement robust error handling for GROBID integration:

```python
import logging

# Configure logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
    handlers=[
        logging.FileHandler("grobid_processing.log"),
        logging.StreamHandler()
    ]
)

logger = logging.getLogger("grobid_client")

# Enhanced error handling in client
def process_pdf(self, pdf_path, output_path=None):
    try:
        # Existing code...
        logger.info(f"Successfully processed {pdf_path}")
        return response.text
    except FileNotFoundError as e:
        logger.error(f"File not found: {pdf_path}")
        raise
    except requests.exceptions.ConnectionError:
        logger.error(f"Could not connect to GROBID service at {self.base_url}")
        raise Exception("GROBID service unavailable. Check if the server is running.")
    except Exception as e:
        logger.error(f"Error processing {pdf_path}: {str(e)}")
        raise
```