(function () {
  const root = document.getElementById("dashboard-root");
  if (!root) {
    return;
  }

  const state = {
    user: (window.APP_BOOTSTRAP && window.APP_BOOTSTRAP.user) || null,
    suppliers: [],
    statuses: [],
    items: [],
    orders: [],
    users: [],
    purgeInfo: null,
    modeloDisponivel: true,
    editing: null,
  };

  const urls = window.APP_BOOTSTRAP ? window.APP_BOOTSTRAP.urls : {};

  const elements = {
    toast: document.getElementById("toast"),
    supplierSelect: document.getElementById("supplier-select"),
    itemQuantidade: document.getElementById("item-quantidade"),
    itemCodigo: document.getElementById("item-codigo"),
    itemDescricao: document.getElementById("item-descricao"),
    itemPrefixo: document.getElementById("item-prefixo"),
    itemValor: document.getElementById("item-valor"),
    itemEstoque: document.getElementById("item-estoque"),
    addItemBtn: document.getElementById("add-item-btn"),
    itemsTableBody: document.querySelector("#items-table tbody"),
    newOrderForm: document.getElementById("new-order-form"),
    newSupplierBtn: document.getElementById("new-supplier-btn"),
    filterFornecedor: document.getElementById("filter-fornecedor"),
    filterStatus: document.getElementById("filter-status"),
    applyFiltersBtn: document.getElementById("apply-filters-btn"),
    clearFiltersBtn: document.getElementById("clear-filters-btn"),
    ordersTableBody: document.querySelector("#orders-table tbody"),
    purgeInfo: document.getElementById("purge-info"),
    changePasswordBtn: document.getElementById("change-password-btn"),
    manageUsersBtn: document.getElementById("manage-users-btn"),
    orderDetailsDialog: document.getElementById("order-details-dialog"),
    orderDetailsBody: document.getElementById("order-details-body"),
    editOrderDialog: document.getElementById("edit-order-dialog"),
    editOrderBody: document.getElementById("edit-order-body"),
    editAddItemBtn: document.getElementById("edit-add-item-btn"),
    saveEditOrderBtn: document.getElementById("save-edit-order-btn"),
    passwordDialog: document.getElementById("password-dialog"),
    passwordField: document.getElementById("new-password-field"),
    confirmPasswordBtn: document.getElementById("confirm-password-btn"),
    usersDialog: document.getElementById("users-dialog"),
    usersTableBody: document.querySelector("#users-table tbody"),
    newUserForm: document.getElementById("new-user-form"),
    newUserUsername: document.getElementById("new-user-username"),
    newUserPassword: document.getElementById("new-user-password"),
    newUserRole: document.getElementById("new-user-role"),
  };

  const currencyFormatter = new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  });

  let editItemsContainer = null;
  let toastTimer = null;

  function escapeHtml(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  function formatCurrency(value) {
    const number = Number(value || 0);
    return currencyFormatter.format(number);
  }

  function formatDateTime(value) {
    if (!value) {
      return "-";
    }
    const normalized = String(value).replace(" ", "T");
    const date = new Date(normalized);
    if (Number.isNaN(date.getTime())) {
      return value;
    }
    return date.toLocaleString("pt-BR");
  }

  function showToast(message, type = "success", duration = 3500) {
    if (!elements.toast) {
      return;
    }
    clearTimeout(toastTimer);
    elements.toast.textContent = message;
    elements.toast.className = "";
    elements.toast.classList.add("show");
    if (type === "error") {
      elements.toast.classList.add("error");
    } else if (type === "success") {
      elements.toast.classList.add("success");
    }
    toastTimer = setTimeout(() => {
      elements.toast.className = "";
      elements.toast.textContent = "";
    }, duration);
  }

  async function apiFetch(url, { method = "GET", data = null } = {}) {
    const options = {
      method,
      headers: {},
      credentials: "same-origin",
    };
    if (data !== null) {
      options.headers["Content-Type"] = "application/json";
      options.body = JSON.stringify(data);
    }
    const response = await fetch(url, options);
    let payload = {};
    const isJson = response.headers
      .get("content-type", "")
      .includes("application/json");
    if (isJson) {
      payload = await response.json();
    }
    if (!response.ok) {
      const message =
        (payload && payload.error) || "Falha ao processar a requisicao";
      throw new Error(message);
    }
    return payload;
  }

  function buildUrls() {
    return {
      pedido: (id) => urls.pedido.replace(/0$/, String(id)),
      approve: (id) => urls.approve.replace("/0/", `/${id}/`),
      generate: (id) => urls.generate.replace("/0/", `/${id}/`),
      download: (id) => urls.download.replace("/0/", `/${id}/`),
      userDelete: (username) =>
        urls.user_delete.replace("__USERNAME__", encodeURIComponent(username)),
    };
  }

  const dynamicUrl = buildUrls();

  async function loadContext() {
    try {
      const data = await apiFetch(urls.context);
      state.suppliers = data.suppliers || [];
      state.statuses = data.statuses || [];
      state.users = data.users || [];
      state.purgeInfo = data.purged_on_start;
      state.modeloDisponivel = Boolean(data.modelo_disponivel);
      renderSuppliers();
      renderStatuses();
      updateSystemInfo();
      renderUsersTable();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function renderSuppliers() {
    const select = elements.supplierSelect;
    if (!select) {
      return;
    }
    select.innerHTML = "";
    if (!state.suppliers.length) {
      const option = document.createElement("option");
      option.value = "";
      option.textContent = "Cadastre um fornecedor";
      select.appendChild(option);
      select.disabled = true;
      return;
    }
    select.disabled = false;
    state.suppliers.forEach((nome) => {
      const option = document.createElement("option");
      option.value = nome;
      option.textContent = nome;
      select.appendChild(option);
    });
  }

  function renderStatuses() {
    const select = elements.filterStatus;
    if (!select) {
      return;
    }
    const current = select.value;
    select.innerHTML = '<option value="">Todos</option>';
    state.statuses.forEach((status) => {
      const option = document.createElement("option");
      option.value = status;
      option.textContent = status;
      select.appendChild(option);
    });
    if (current) {
      select.value = current;
    }
  }

  function renderItemsTable() {
    const tbody = elements.itemsTableBody;
    if (!tbody) {
      return;
    }
    tbody.innerHTML = "";
    if (!state.items.length) {
      const row = document.createElement("tr");
      row.className = "placeholder";
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "Nenhum item adicionado ainda";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    state.items.forEach((item, index) => {
      const row = document.createElement("tr");
      row.innerHTML = `
        <td>${item.quantidade}</td>
        <td>${escapeHtml(item.codigo)}</td>
        <td>${escapeHtml(item.descricao)}</td>
        <td>${escapeHtml(item.prefixo)}</td>
        <td>${formatCurrency(item.valor)}</td>
        <td>${item.estoque}</td>
        <td class="user-table-actions">
          <button type="button" class="icon-btn remove-item-btn" data-index="${index}" title="Remover item">&times;</button>
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  function resetItemInputs() {
    elements.itemQuantidade.value = "";
    elements.itemCodigo.value = "";
    elements.itemDescricao.value = "";
    elements.itemPrefixo.value = "";
    elements.itemValor.value = "";
    elements.itemEstoque.value = "";
    elements.itemQuantidade.focus();
  }

  function addItemFromInputs() {
    try {
      const quantidade = parseInt(elements.itemQuantidade.value, 10);
      if (!quantidade || quantidade <= 0) {
        throw new Error("Informe uma quantidade valida");
      }
      const codigo = elements.itemCodigo.value.trim();
      const descricao = elements.itemDescricao.value.trim();
      const prefixo = elements.itemPrefixo.value.trim();
      const valor = Number(
        (elements.itemValor.value || "").toString().replace(",", ".")
      );
      if (!codigo || !descricao) {
        throw new Error("Informe codigo e descricao");
      }
      if (Number.isNaN(valor) || valor < 0) {
        throw new Error("Informe um valor valido");
      }
      const estoque = parseInt(elements.itemEstoque.value, 10);
      if (Number.isNaN(estoque) || estoque < 0) {
        throw new Error("Informe o estoque");
      }
      state.items.push({
        quantidade,
        codigo,
        descricao,
        prefixo,
        valor,
        estoque,
      });
      renderItemsTable();
      resetItemInputs();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function updateSystemInfo() {
    if (!elements.purgeInfo) {
      return;
    }
    const info = [];
    if (typeof state.purgeInfo === "number") {
      if (state.purgeInfo > 0) {
        info.push(
          `${state.purgeInfo} pedidos antigos foram removidos automaticamente.`
        );
      }
    }
    if (!state.modeloDisponivel) {
      info.push("Arquivo modelo_pedido.xlsm nao foi encontrado.");
    }
    elements.purgeInfo.textContent = info.join(" ");
  }

  async function submitNewOrder(event) {
    event.preventDefault();
    if (!state.items.length) {
      showToast("Adicione pelo menos um item ao pedido", "error");
      return;
    }
    const fornecedor = elements.supplierSelect.value;
    if (!fornecedor) {
      showToast("Selecione um fornecedor", "error");
      return;
    }
    try {
      await apiFetch(urls.pedidos, {
        method: "POST",
        data: {
          fornecedor,
          itens: state.items,
        },
      });
      state.items = [];
      renderItemsTable();
      showToast("Pedido criado como pendente", "success");
      await refreshOrders();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function refreshOrders() {
    try {
      const params = new URLSearchParams();
      if (elements.filterFornecedor.value.trim()) {
        params.set("fornecedor", elements.filterFornecedor.value.trim());
      }
      if (elements.filterStatus.value) {
        params.set("status", elements.filterStatus.value);
      }
      const query = params.toString();
      const response = await apiFetch(
        query ? `${urls.pedidos}?${query}` : urls.pedidos
      );
      state.orders = response.pedidos || [];
      renderOrdersTable();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function renderOrdersTable() {
    const tbody = elements.ordersTableBody;
    if (!tbody) {
      return;
    }
    tbody.innerHTML = "";
    if (!state.orders.length) {
      const row = document.createElement("tr");
      row.className = "placeholder";
      const cell = document.createElement("td");
      cell.colSpan = 7;
      cell.textContent = "Nenhum pedido encontrado";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    state.orders.forEach((order) => {
      const tr = document.createElement("tr");
      const arquivoExcel = order.arquivo_excel
        ? `<span class="badge">gerado</span>`
        : "-";
      tr.innerHTML = `
        <td>#${order.id}</td>
        <td>${escapeHtml(order.fornecedor)}</td>
        <td>${escapeHtml(order.created_by || "-")}</td>
        <td>${formatDateTime(order.created_at)}</td>
        <td>${escapeHtml(order.status)}</td>
        <td>${arquivoExcel}</td>
        <td class="user-table-actions"></td>
      `;
      const actionsCell = tr.querySelector(".user-table-actions");
      actionsCell.appendChild(
        createActionButton("Ver", "view", order.id, "ghost")
      );
      if (
        order.status === "Pendente" &&
        ["creator", "approver", "admin"].includes(state.user.role)
      ) {
        actionsCell.appendChild(
          createActionButton("Editar", "edit", order.id, "secondary")
        );
      }
      if (
        order.status === "Pendente" &&
        ["approver", "admin"].includes(state.user.role)
      ) {
        actionsCell.appendChild(
          createActionButton("Aprovar", "approve", order.id, "success")
        );
      }
      if (["Aprovado", "Gerado"].includes(order.status)) {
        actionsCell.appendChild(
          createActionButton("Gerar", "generate", order.id, "primary")
        );
      }
      if (order.arquivo_excel) {
        actionsCell.appendChild(
          createActionButton("Download", "download", order.id, "ghost")
        );
      }
      tbody.appendChild(tr);
    });
  }

  function createActionButton(label, action, id, style) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `btn ${style}`;
    button.dataset.action = action;
    button.dataset.id = String(id);
    button.textContent = label;
    return button;
  }

  function handleItemsTableClick(event) {
    const button = event.target.closest(".remove-item-btn");
    if (!button) {
      return;
    }
    const index = Number(button.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }
    state.items.splice(index, 1);
    renderItemsTable();
  }

  function clearFilters() {
    elements.filterFornecedor.value = "";
    elements.filterStatus.value = "";
    refreshOrders();
  }

  async function handleOrdersTableClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
      return;
    }
    const id = Number(button.dataset.id);
    const action = button.dataset.action;
    if (!id) {
      return;
    }
    if (action === "view") {
      openOrderDetails(id);
    } else if (action === "edit") {
      openEditOrder(id);
    } else if (action === "approve") {
      approveOrder(id);
    } else if (action === "generate") {
      generateOrder(id);
    } else if (action === "download") {
      downloadOrder(id);
    }
  }

  async function openOrderDetails(id) {
    try {
      const data = await apiFetch(dynamicUrl.pedido(id));
      const pedido = data.pedido;
      if (!pedido) {
        throw new Error("Pedido nao encontrado");
      }
      renderOrderDetails(pedido);
      openDialog(elements.orderDetailsDialog);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function renderOrderDetails(pedido) {
    const body = elements.orderDetailsBody;
    if (!body) {
      return;
    }
    const total = (pedido.itens || []).reduce(
      (sum, item) => sum + Number(item.total || item.quantidade * item.valor || 0),
      0
    );
    const rows = (pedido.itens || [])
      .map(
        (item) => `
          <tr>
            <td>${item.quantidade}</td>
            <td>${escapeHtml(item.codigo)}</td>
            <td>${escapeHtml(item.descricao)}</td>
            <td>${escapeHtml(item.prefixo)}</td>
            <td>${formatCurrency(item.valor)}</td>
            <td>${formatCurrency(item.total || item.quantidade * item.valor)}</td>
          </tr>
        `
      )
      .join("");
    const arquivo = pedido.arquivo_excel
      ? `<a class="btn ghost" href="${dynamicUrl.download(
          pedido.id
        )}" target="_blank" rel="noopener">Baixar arquivo</a>`
      : "Arquivo ainda nao gerado";

    body.innerHTML = `
      <div class="details-grid">
        <p><strong>Fornecedor:</strong> ${escapeHtml(pedido.fornecedor)}</p>
        <p><strong>Status:</strong> ${escapeHtml(pedido.status)}</p>
        <p><strong>Criado por:</strong> ${escapeHtml(pedido.created_by || "-")}</p>
        <p><strong>Data:</strong> ${formatDateTime(pedido.created_at)}</p>
      </div>
      <div class="muted">Arquivo: ${arquivo}</div>
      <div class="items-table-wrapper">
        <table class="data-table compact">
          <thead>
            <tr>
              <th>Qtd</th>
              <th>Codigo</th>
              <th>Descricao</th>
              <th>Prefixo</th>
              <th>Valor</th>
              <th>Total</th>
            </tr>
          </thead>
          <tbody>
            ${rows || '<tr class="placeholder"><td colspan="6">Sem itens</td></tr>'}
          </tbody>
        </table>
      </div>
      <p class="muted"><strong>Total:</strong> ${formatCurrency(total)}</p>
    `;
  }

  function openDialog(dialog) {
    if (!dialog) {
      return;
    }
    if (typeof dialog.showModal === "function") {
      dialog.showModal();
    } else {
      dialog.setAttribute("open", "");
    }
  }

  function closeDialog(dialog) {
    if (!dialog) {
      return;
    }
    if (typeof dialog.close === "function") {
      dialog.close();
    } else {
      dialog.removeAttribute("open");
    }
  }

  async function openEditOrder(id) {
    try {
      const data = await apiFetch(dynamicUrl.pedido(id));
      const pedido = data.pedido;
      if (!pedido || pedido.status !== "Pendente") {
        throw new Error("Somente pedidos pendentes podem ser editados");
      }
      state.editing = {
        id,
        fornecedor: pedido.fornecedor,
        items: (pedido.itens || []).map((item) => ({
          quantidade: item.quantidade,
          codigo: item.codigo,
          descricao: item.descricao,
          prefixo: item.prefixo,
          valor: item.valor,
          estoque: item.estoque,
        })),
      };
      renderEditDialog();
      openDialog(elements.editOrderDialog);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function renderEditDialog() {
    const body = elements.editOrderBody;
    if (!body || !state.editing) {
      return;
    }
    body.innerHTML = "";
    const info = document.createElement("p");
    info.className = "muted";
    info.innerHTML = `<strong>Fornecedor:</strong> ${escapeHtml(
      state.editing.fornecedor
    )}`;
    body.appendChild(info);

    editItemsContainer = document.createElement("div");
    editItemsContainer.id = "edit-items-container";
    editItemsContainer.className = "items-edit-container";
    body.appendChild(editItemsContainer);
    renderEditItems();
  }

  function renderEditItems() {
    if (!editItemsContainer || !state.editing) {
      return;
    }
    editItemsContainer.innerHTML = "";
    if (!state.editing.items.length) {
      const placeholder = document.createElement("p");
      placeholder.className = "muted";
      placeholder.textContent =
        "Nenhum item. Utilize o botao Adicionar item para incluir novos produtos.";
      editItemsContainer.appendChild(placeholder);
      return;
    }

    state.editing.items.forEach((item, index) => {
      const row = document.createElement("div");
      row.className = "items-edit-grid";
      row.dataset.index = String(index);
      row.innerHTML = `
        <input type="number" name="quantidade" min="1" value="${item.quantidade}" title="Quantidade">
        <input type="text" name="codigo" value="${escapeHtml(
          item.codigo
        )}" title="Codigo">
        <input type="text" name="descricao" value="${escapeHtml(
          item.descricao
        )}" title="Descricao">
        <input type="text" name="prefixo" value="${escapeHtml(
          item.prefixo
        )}" title="Prefixo">
        <input type="number" name="valor" step="0.01" min="0" value="${item.valor}" title="Valor">
        <input type="number" name="estoque" min="0" value="${item.estoque}" title="Estoque">
        <button type="button" class="remove-btn" title="Remover item">&times;</button>
      `;
      editItemsContainer.appendChild(row);
    });
  }

  function handleEditInputs(event) {
    if (!state.editing) {
      return;
    }
    const row = event.target.closest(".items-edit-grid");
    if (!row) {
      return;
    }
    const index = Number(row.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }
    const field = event.target.name;
    if (!field) {
      return;
    }
    const value = event.target.value;
    const item = state.editing.items[index];
    if (!item) {
      return;
    }
    if (field === "quantidade" || field === "estoque") {
      const number = parseInt(value, 10);
      if (!Number.isNaN(number)) {
        item[field] = number;
      }
    } else if (field === "valor") {
      const number = Number(value.toString().replace(",", "."));
      if (!Number.isNaN(number)) {
        item.valor = number;
      }
    } else if (field === "codigo" || field === "descricao" || field === "prefixo") {
      item[field] = value;
    }
  }

  function handleEditItemRemoval(event) {
    if (!state.editing) {
      return;
    }
    const button = event.target.closest(".remove-btn");
    if (!button) {
      return;
    }
    const row = button.closest(".items-edit-grid");
    if (!row) {
      return;
    }
    const index = Number(row.dataset.index);
    if (Number.isNaN(index)) {
      return;
    }
    state.editing.items.splice(index, 1);
    renderEditItems();
  }

  function addEditItem() {
    if (!state.editing) {
      return;
    }
    state.editing.items.push({
      quantidade: 1,
      codigo: "",
      descricao: "",
      prefixo: "",
      valor: 0,
      estoque: 0,
    });
    renderEditItems();
  }

  async function saveEditedOrder() {
    if (!state.editing) {
      return;
    }
    const items = state.editing.items.map((item) => ({
      quantidade: item.quantidade,
      codigo: item.codigo,
      descricao: item.descricao,
      prefixo: item.prefixo,
      valor: item.valor,
      estoque: item.estoque,
    }));
    try {
      elements.saveEditOrderBtn.disabled = true;
      await apiFetch(dynamicUrl.pedido(state.editing.id), {
        method: "PUT",
        data: { itens: items },
      });
      showToast("Pedido atualizado com sucesso", "success");
      closeDialog(elements.editOrderDialog);
      state.editing = null;
      await refreshOrders();
    } catch (error) {
      showToast(error.message, "error");
    } finally {
      elements.saveEditOrderBtn.disabled = false;
    }
  }

  async function approveOrder(id) {
    try {
      const result = await apiFetch(dynamicUrl.approve(id), { method: "POST" });
      if (result.warning) {
        showToast(result.warning, "error");
      } else {
        showToast("Pedido aprovado", "success");
      }
      await refreshOrders();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function generateOrder(id) {
    try {
      await apiFetch(dynamicUrl.generate(id), { method: "POST" });
      showToast("Arquivo gerado com sucesso", "success");
      await refreshOrders();
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function downloadOrder(id) {
    const url = dynamicUrl.download(id);
    window.open(url, "_blank", "noopener");
  }

  async function createSupplier() {
    const nome = window.prompt("Nome do novo fornecedor:");
    if (!nome) {
      return;
    }
    try {
      const data = await apiFetch(urls.fornecedores, {
        method: "POST",
        data: { nome },
      });
      state.suppliers = data.suppliers || [];
      renderSuppliers();
      if (elements.supplierSelect) {
        elements.supplierSelect.value = data.supplier;
      }
      showToast("Fornecedor cadastrado", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function setupDialogCloseButtons() {
    document.querySelectorAll("[data-close-dialog]").forEach((btn) => {
      btn.addEventListener("click", () => {
        const dialog = btn.closest("dialog");
        closeDialog(dialog);
      });
    });
  }

  function openPasswordDialog() {
    if (!elements.passwordDialog) {
      return;
    }
    elements.passwordField.value = "";
    openDialog(elements.passwordDialog);
  }

  async function updatePassword() {
    const nova = elements.passwordField.value.trim();
    if (!nova) {
      showToast("Informe a nova senha", "error");
      return;
    }
    try {
      await apiFetch(urls.me_password, {
        method: "POST",
        data: { new_password: nova },
      });
      showToast("Senha atualizada", "success");
      closeDialog(elements.passwordDialog);
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function openUsersDialog() {
    if (!elements.usersDialog) {
      return;
    }
    renderUsersTable();
    openDialog(elements.usersDialog);
  }

  function renderUsersTable() {
    const tbody = elements.usersTableBody;
    if (!tbody) {
      return;
    }
    tbody.innerHTML = "";
    if (!state.users.length) {
      const row = document.createElement("tr");
      row.className = "placeholder";
      const cell = document.createElement("td");
      cell.colSpan = 3;
      cell.textContent = "Nenhum usuario cadastrado";
      row.appendChild(cell);
      tbody.appendChild(row);
      return;
    }

    state.users.forEach((user) => {
      const row = document.createElement("tr");
      const canDelete = user.username !== state.user.username;
      row.innerHTML = `
        <td>${escapeHtml(user.username)}</td>
        <td><span class="badge">${escapeHtml(user.role)}</span></td>
        <td class="user-table-actions">
          ${
            canDelete
              ? `<button type="button" class="btn danger" data-delete-user="${escapeHtml(
                  user.username
                )}">Remover</button>`
              : ""
          }
        </td>
      `;
      tbody.appendChild(row);
    });
  }

  async function createUser(event) {
    event.preventDefault();
    const username = elements.newUserUsername.value.trim().toUpperCase();
    const password = elements.newUserPassword.value.trim();
    const role = elements.newUserRole.value;
    if (!username || !password) {
      showToast("Preencha usuario e senha", "error");
      return;
    }
    try {
      const response = await apiFetch(urls.users, {
        method: "POST",
        data: { username, password, role },
      });
      state.users = response.users || [];
      renderUsersTable();
      elements.newUserForm.reset();
      showToast("Usuario criado com sucesso", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  async function handleUserRemoval(event) {
    const button = event.target.closest("button[data-delete-user]");
    if (!button) {
      return;
    }
    const username = button.dataset.deleteUser;
    if (!username) {
      return;
    }
    if (
      !window.confirm(`Confirma remover o usuario ${username.toUpperCase()}?`)
    ) {
      return;
    }
    try {
      const response = await apiFetch(dynamicUrl.userDelete(username), {
        method: "DELETE",
      });
      state.users = response.users || [];
      renderUsersTable();
      showToast("Usuario removido", "success");
    } catch (error) {
      showToast(error.message, "error");
    }
  }

  function initEventListeners() {
    if (elements.addItemBtn) {
      elements.addItemBtn.addEventListener("click", addItemFromInputs);
    }
    if (elements.itemsTableBody) {
      elements.itemsTableBody.addEventListener("click", handleItemsTableClick);
    }
    if (elements.newOrderForm) {
      elements.newOrderForm.addEventListener("submit", submitNewOrder);
    }
    if (elements.newSupplierBtn) {
      elements.newSupplierBtn.addEventListener("click", createSupplier);
    }
    if (elements.applyFiltersBtn) {
      elements.applyFiltersBtn.addEventListener("click", refreshOrders);
    }
    if (elements.clearFiltersBtn) {
      elements.clearFiltersBtn.addEventListener("click", clearFilters);
    }
    if (elements.ordersTableBody) {
      elements.ordersTableBody.addEventListener(
        "click",
        handleOrdersTableClick
      );
    }
    if (elements.editOrderBody) {
      elements.editOrderBody.addEventListener("input", handleEditInputs);
      elements.editOrderBody.addEventListener("click", handleEditItemRemoval);
    }
    if (elements.editAddItemBtn) {
      elements.editAddItemBtn.addEventListener("click", addEditItem);
    }
    if (elements.saveEditOrderBtn) {
      elements.saveEditOrderBtn.addEventListener("click", saveEditedOrder);
    }
    if (elements.changePasswordBtn) {
      elements.changePasswordBtn.addEventListener(
        "click",
        openPasswordDialog
      );
    }
    if (elements.confirmPasswordBtn) {
      elements.confirmPasswordBtn.addEventListener("click", updatePassword);
    }
    if (elements.manageUsersBtn) {
      elements.manageUsersBtn.addEventListener("click", openUsersDialog);
    }
    if (elements.newUserForm) {
      elements.newUserForm.addEventListener("submit", createUser);
    }
    if (elements.usersTableBody) {
      elements.usersTableBody.addEventListener("click", handleUserRemoval);
    }
    setupDialogCloseButtons();
  }

  async function bootstrap() {
    renderItemsTable();
    initEventListeners();
    await loadContext();
    await refreshOrders();
  }

  bootstrap();
})();
