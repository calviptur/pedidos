PedidoApp
=========

Aplicativo Flask para registrar pedidos, administrar aprovacao e gerar planilhas a partir de um modelo Excel.

Requisitos
----------
- Python 3.10 ou 3.11
- pip

Configuracao local
------------------
1. (Opcional) Crie um ambiente virtual:
   - Windows PowerShell: `python -m venv .venv` e `.\.venv\Scripts\Activate.ps1`
   - Linux/macOS: `python -m venv .venv` e `source .venv/bin/activate`
2. Instale dependencias: `pip install -r requirements.txt`
3. Variaveis de ambiente disponiveis:
   - `PEDIDOS_SECRET_KEY`: chave da sessao Flask (padrao: `change-me`)
   - `PEDIDOS_STORAGE_DIR`: raiz onde o SQLite e os arquivos gerados sao gravados (padrao: pasta do projeto)
   - `PEDIDOS_DB_PATH`, `PEDIDOS_MODELO_PATH`, `PEDIDOS_GERADOS_DIR`, `PEDIDOS_APROVADOS_DIR`: caminhos especificos para sobrescrever cada recurso
4. Execute em modo de desenvolvimento: `python pedidos.py`

Deploy no Render
----------------
- O arquivo `render.yaml` usa build `pip install -r requirements.txt` e start `gunicorn pedidos:app`.
- Um disco persistente eh montado em `/var/pedidos` (configurado via `PEDIDOS_STORAGE_DIR`).
- Caso o servico Render tenha sido criado antes desta atualizacao e ainda utilize `gunicorn your_application.wsgi`, o pacote `your_application/` mapeia o app Flask para esse comando padrao.
- Para criar/atualizar o servico:
  1. Conecte o repositorio ao Render.
  2. Ao criar o servico, selecione a blueprint (Render detecta `render.yaml` automaticamente) ou atualize o Start Command para `gunicorn pedidos:app`.
  3. Garanta que o arquivo `modelo_pedido.xlsm` esteja no repositorio ou configure `PEDIDOS_MODELO_PATH`.

Notas
-----
- Diretórios legados `Pedidos Gerados`, `PedidosAprovados` e o arquivo `pedidos.db` sao detectados automaticamente no diretorio pai, preservando compatibilidade com o ambiente local original.
- O modelo Excel precisa conter uma aba com nome contendo `IMPRESSAO`.
