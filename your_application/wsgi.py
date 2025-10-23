"""Ponto de entrada WSGI para compatibilidade com Render e Gunicorn."""

from . import application

# Alguns servidores procuram por `app`.
app = application

