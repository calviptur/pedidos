"""WSGI compatibility package for platform defaults.

Render cria serviços Python com o comando padrão
`gunicorn your_application.wsgi`. Este pacote expõe a aplicação Flask
definida em `pedidos.py` sob o nome esperado (`application`) para manter
compatibilidade com essa configuração.
"""

from pedidos import app as application

# Alias opcional para quem procurar `app`.
app = application

