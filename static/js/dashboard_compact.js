window.dashboardCompact = (function () {
  async function fetchCtx() {
    try {
      const response = await fetch("/api/context");
      if (response.status === 401) {
        window.location.href = "/login";
        return null;
      }
      return await response.json();
    } catch (error) {
      console.error("Falha ao carregar contexto", error);
      alert("Falha ao carregar contexto.");
      return null;
    }
  }

  function el(tag, attrs = {}, text = "") {
    const element = document.createElement(tag);
    Object.entries(attrs).forEach(([key, value]) => {
      element.setAttribute(key, value);
    });
    if (text) {
      element.textContent = text;
    }
    return element;
  }

  function renderSuppliers(list) {
    const container = document.getElementById("supplier-list");
    if (!container) {
      return;
    }
    container.innerHTML = "";
    list.forEach((supplier) => {
      const li = el("li", { class: "list-group-item p-1" }, supplier);
      container.appendChild(li);
    });
  }

  function renderOrders(pedidos) {
    const container = document.getElementById("orders-table");
    if (!container) {
      return;
    }
    container.innerHTML = "";
    if (!pedidos || !pedidos.length) {
      const empty = el(
        "div",
        { class: "text-muted text-center py-3" },
        "Nenhum pedido encontrado"
      );
      container.appendChild(empty);
      return;
    }

    const table = el("table", { class: "table table-sm align-middle" });
    table.innerHTML =
      "<thead><tr><th>#</th><th>Fornecedor</th><th>Data</th><th>Status</th><th>Acoes</th></tr></thead>";
    const tbody = el("tbody");

    pedidos.forEach((pedido) => {
      const tr = el("tr");
      const data = pedido.created_at
        ? new Date(pedido.created_at.replace(" ", "T")).toLocaleString()
        : "-";
      const actions = [];
      actions.push(
        `<a class="btn btn-sm btn-outline-secondary me-1" href="/pedidos/${pedido.id}">Ver</a>`
      );
      if (pedido.arquivo_excel) {
        actions.push(
          `<a class="btn btn-sm btn-primary" href="/pedidos/${pedido.id}/download" target="_blank" rel="noopener">Baixar</a>`
        );
      }
      tr.innerHTML = `
        <td>${pedido.id}</td>
        <td>${pedido.fornecedor}</td>
        <td>${data}</td>
        <td>${pedido.status}</td>
        <td>${actions.join(" ")}</td>
      `;
      tbody.appendChild(tr);
    });

    table.appendChild(tbody);
    container.appendChild(table);
  }

  function createItemRow() {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td><input class="form-control form-control-sm item-quant" type="number" min="1" value="1" required></td>
      <td><input class="form-control form-control-sm item-prefix" type="text"></td>
      <td><input class="form-control form-control-sm item-codigo" type="text" required></td>
      <td><input class="form-control form-control-sm item-desc" type="text" required></td>
      <td><input class="form-control form-control-sm item-valor" type="number" step="0.01" value="0.00" required></td>
      <td><button type="button" class="btn btn-sm btn-danger remove-item">-</button></td>
    `;
    const removeBtn = tr.querySelector(".remove-item");
    if (removeBtn) {
      removeBtn.addEventListener("click", () => {
        tr.remove();
      });
    }
    return tr;
  }

  async function openOrderModal() {
    const ctx = await fetchCtx();
    if (!ctx) {
      return;
    }
    const select = document.getElementById("order-fornecedor");
    if (!select) {
      return;
    }
    select.innerHTML = "";
    ctx.suppliers.forEach((supplier) => {
      const option = el("option", { value: supplier }, supplier);
      select.appendChild(option);
    });

    const tbody = document.querySelector("#items-table tbody");
    if (tbody) {
      tbody.innerHTML = "";
      tbody.appendChild(createItemRow());
    }

    const modalElement = document.getElementById("orderModal");
    const modal = modalElement ? new bootstrap.Modal(modalElement) : null;
    modal?.show();

    const saveButton = document.getElementById("save-order");
    if (!saveButton) {
      return;
    }

    saveButton.onclick = async () => {
      const items = [];
      if (tbody) {
        tbody.querySelectorAll("tr").forEach((row) => {
          const quantidade = row.querySelector(".item-quant")?.value;
          const prefixo = row.querySelector(".item-prefix")?.value || "";
          const codigo = row.querySelector(".item-codigo")?.value || "";
          const descricao = row.querySelector(".item-desc")?.value || "";
          const valor = row.querySelector(".item-valor")?.value;

          if (!codigo.trim() && !descricao.trim()) {
            return;
          }
          items.push({
            quantidade,
            prefixo,
            codigo,
            descricao,
            valor,
          });
        });
      }

      const payload = { fornecedor: select.value, itens: items };
      try {
        const response = await fetch("/api/pedidos", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Falha ao criar pedido");
        }
        modal?.hide();
        await loadDashboard();
      } catch (error) {
        console.error("Erro ao salvar pedido", error);
        alert(error.message || "Falha ao salvar pedido.");
      }
    };
  }

  async function loadDashboard() {
    const ctx = await fetchCtx();
    if (!ctx) {
      return;
    }
    renderSuppliers(ctx.suppliers || []);

    try {
      const response = await fetch("/api/pedidos");
      const data = await response.json();
      renderOrders(data.pedidos || []);
    } catch (error) {
      console.error("Falha ao carregar pedidos", error);
      alert("Falha ao carregar pedidos.");
    }
  }

  function bind() {
    const addSupplier = document.getElementById("add-supplier");
    if (addSupplier) {
      addSupplier.addEventListener("click", async () => {
        const input = document.getElementById("new-supplier");
        const nome = input?.value.trim();
        if (!nome) {
          return;
        }
        try {
          const response = await fetch("/api/fornecedores", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ nome }),
          });
          const data = await response.json();
          if (!response.ok) {
            throw new Error(data.error || "Falha ao criar fornecedor");
          }
          if (input) {
            input.value = "";
          }
          await loadDashboard();
        } catch (error) {
          console.error("Erro ao adicionar fornecedor", error);
          alert(error.message || "Falha ao adicionar fornecedor.");
        }
      });
    }

    const newOrderBtn = document.getElementById("btn-new-order");
    if (newOrderBtn) {
      newOrderBtn.addEventListener("click", (event) => {
        event.preventDefault();
        openOrderModal();
      });
    }

    const addItemBtn = document.getElementById("add-item");
    if (addItemBtn) {
      addItemBtn.addEventListener("click", (event) => {
        event.preventDefault();
        const tbody = document.querySelector("#items-table tbody");
        tbody?.appendChild(createItemRow());
      });
    }
  }

  async function init() {
    bind();
    await loadDashboard();
  }

  return { init };
})();
