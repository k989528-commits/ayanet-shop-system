/* =====================================
   AYANET ADMIN DASHBOARD
   PRODUCTS + BUYING COST + SELLING PRICE
   LOW STOCK + SMART RESTOCK
   SALES + SHOP EXPENSES
   DAILY + MONTHLY FINANCIAL REPORTS
   SERVICE MANAGEMENT
   COMPLETED ORDER DELETION
===================================== */

document.addEventListener("DOMContentLoaded", function () {

    const db = window.supabase.createClient(
        "https://jltadhukraspfdaxbvwo.supabase.co",
        "sb_publishable_tItrrAg_q9xSCskecgc5Jg_bJkxsOiu"
    );

    const get = id => document.getElementById(id);
    const LOW_STOCK_LEVEL = 20;
    const SHOP_TIMEZONE = "Africa/Nairobi";

    function money(value) {
        return Number(value || 0).toFixed(2);
    }

    function getKenyaDateKey(date) {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: SHOP_TIMEZONE,
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).formatToParts(date);

        const values = {};
        parts.forEach(part => values[part.type] = part.value);

        return values.year + "-" + values.month + "-" + values.day;
    }

    function getKenyaMonthKey(date) {
        const parts = new Intl.DateTimeFormat("en-GB", {
            timeZone: SHOP_TIMEZONE,
            year: "numeric",
            month: "2-digit"
        }).formatToParts(date);

        const year = parts.find(p => p.type === "year").value;
        const month = parts.find(p => p.type === "month").value;

        return year + "-" + month;
    }

    function showDashboard(isLoggedIn) {
        get("loginSection").style.display = isLoggedIn ? "none" : "block";
        get("adminDashboard").style.display = isLoggedIn ? "block" : "none";
    }

    // =====================================
    // ADMIN LOGIN
    // =====================================

    get("adminLoginForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const message = get("loginMessage");
        message.textContent = "Logging in...";

        try {
            const { error } = await db.auth.signInWithPassword({
                email: get("adminEmail").value,
                password: get("adminPassword").value
            });

            if (error) {
                message.textContent = "Login failed: " + error.message;
                return;
            }

            message.textContent = "Login successful!";
            await startDashboard();

        } catch (error) {
            message.textContent = "Error: " + error.message;
        }
    });

    // =====================================
    // SERVICE MANAGEMENT
    // =====================================

    get("serviceForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const message = get("serviceMessage");
        const category = get("serviceCategory").value.trim();
        const serviceName = get("serviceName").value.trim();
        const description = get("serviceDescription").value.trim();
        const priceInput = get("servicePrice").value;
        const price = Number(priceInput);

        if (!category || !serviceName || priceInput === "" ||
            !Number.isFinite(price) || price < 0) {
            message.textContent = "Enter a category, service name and valid price.";
            return;
        }

        const button = this.querySelector('button[type="submit"]');
        button.disabled = true;
        message.textContent = "Adding service...";

        try {
            const { error } = await db.from("services").insert([{
                category,
                service_name: serviceName,
                description,
                price,
                is_active: true
            }]);

            if (error) {
                message.textContent = "Could not add service: " + error.message;
                return;
            }

            message.textContent = "Service added successfully!";
            this.reset();
            await loadServices();

        } catch (error) {
            message.textContent = "Service error: " + error.message;

        } finally {
            button.disabled = false;
        }
    });

    async function loadServices() {
        const container = get("services");

        const { data, error } = await db
            .from("services")
            .select("*")
            .order("category")
            .order("service_name");

        if (error) {
            container.textContent = "Could not load services: " + error.message;
            return;
        }

        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.textContent = "No services added yet.";
            return;
        }

        const groups = {};

        data.forEach(service => {
            const category = service.category || "Other";
            if (!groups[category]) groups[category] = [];
            groups[category].push(service);
        });

        Object.keys(groups).forEach(category => {
            const categoryCard = document.createElement("div");
            categoryCard.className = "service-category-card";

            const heading = document.createElement("h3");
            heading.textContent = category;
            categoryCard.appendChild(heading);

            groups[category].forEach(service => {
                const card = document.createElement("div");
                card.className = "service-card";

                const name = document.createElement("h4");
                name.textContent = service.service_name;

                const description = document.createElement("p");
                description.textContent = service.description || "No description provided.";

                const price = document.createElement("p");
                price.textContent = "Customer price: KSh " + money(service.price);

                const status = document.createElement("p");
                status.textContent = service.is_active ? "Status: ACTIVE" : "Status: INACTIVE";

                const editButton = document.createElement("button");
                editButton.type = "button";
                editButton.textContent = "Edit Service";
                editButton.onclick = () => editService(service);

                const toggleButton = document.createElement("button");
                toggleButton.type = "button";
                toggleButton.textContent = service.is_active
                    ? "Deactivate Service"
                    : "Activate Service";
                toggleButton.onclick = () => toggleService(service);

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.textContent = "Delete Service";
                deleteButton.onclick = () => deleteService(service);

                card.append(
                    name, description, price, status,
                    editButton, toggleButton, deleteButton
                );

                categoryCard.appendChild(card);
            });

            container.appendChild(categoryCard);
        });
    }

    async function editService(service) {
        const category = prompt("Enter service category:", service.category);
        if (category === null) return;

        const serviceName = prompt("Enter service name:", service.service_name);
        if (serviceName === null) return;

        const description = prompt(
            "Enter service description:", service.description || ""
        );
        if (description === null) return;

        const priceInput = prompt("Enter customer price in KSh:", service.price);
        if (priceInput === null) return;

        const price = Number(priceInput);

        if (!category.trim() || !serviceName.trim() ||
            priceInput.trim() === "" || !Number.isFinite(price) || price < 0) {
            alert("Please enter valid service information.");
            return;
        }

        const { error } = await db.from("services")
            .update({
                category: category.trim(),
                service_name: serviceName.trim(),
                description: description.trim(),
                price
            })
            .eq("id", service.id);

        if (error) {
            alert("Service update failed: " + error.message);
            return;
        }

        alert("Service updated successfully!");
        await loadServices();
    }

    async function toggleService(service) {
        const newStatus = !service.is_active;
        const action = newStatus ? "activate" : "deactivate";

        if (!confirm("Are you sure you want to " + action +
            " " + service.service_name + "?")) return;

        const { error } = await db.from("services")
            .update({ is_active: newStatus })
            .eq("id", service.id);

        if (error) {
            alert("Could not update service: " + error.message);
            return;
        }

        await loadServices();
    }

    async function deleteService(service) {
        if (!confirm(
            'Permanently delete "' + service.service_name + '"?'
        )) return;

        const { error } = await db.from("services")
            .delete()
            .eq("id", service.id);

        if (error) {
            alert("Could not delete service: " + error.message);
            return;
        }

        alert("Service deleted successfully!");
        await loadServices();
    }

    // =====================================
    // CUSTOMER ORDERS
    // =====================================

    async function loadOrders() {
        const container = get("orders");

        const { data, error } = await db.from("orders")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            container.textContent = "Failed to load orders: " + error.message;
            return;
        }

        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.textContent = "No customer orders yet.";
            return;
        }

        data.forEach(order => {
            const card = document.createElement("div");
            card.className = "order-card";

            const heading = document.createElement("h3");
            heading.textContent = order.customer_name || "Customer";

            const phone = document.createElement("p");
            phone.textContent = "Phone: " + (order.customer_phone || "");

            const service = document.createElement("p");
            service.textContent = "Service: " + (order.service_name || "");

            const details = document.createElement("p");
            details.textContent = "Details: " + (order.order_details || "");

            const status = document.createElement("p");
            status.textContent = "Status: " + (order.status || "Pending");

            card.append(heading, phone, service, details, status);

            if (order.status === "Completed") {
                const completed = document.createElement("p");
                completed.textContent = "Order completed!";
                card.appendChild(completed);

                const deleteButton = document.createElement("button");
                deleteButton.type = "button";
                deleteButton.textContent = "Delete Completed Order";
                deleteButton.onclick = () => deleteCompletedOrder(order.id);
                card.appendChild(deleteButton);

            } else {
                const button = document.createElement("button");
                button.textContent = "Mark as Completed";
                button.onclick = () => completeOrder(order.id);
                card.appendChild(button);
            }

            container.appendChild(card);
        });
    }

    async function completeOrder(orderId) {
        const { error } = await db.from("orders")
            .update({ status: "Completed" })
            .eq("id", orderId);

        if (error) {
            alert("Could not update order: " + error.message);
            return;
        }

        await loadOrders();
    }

    async function deleteCompletedOrder(orderId) {
        if (!confirm(
            "Delete this completed order permanently? Sales history will remain."
        )) return;

        const { error } = await db.from("orders")
            .delete()
            .eq("id", orderId)
            .eq("status", "Completed");

        if (error) {
            alert("Could not delete order: " + error.message);
            return;
        }

        alert("Completed order deleted. Sales history remains unchanged.");
        await loadOrders();
    }

    // =====================================
    // ADD PRODUCT
    // =====================================

    get("productForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const message = get("productMessage");
        const name = get("productName").value.trim();
        const description = get("productDescription").value.trim();

        const costPriceInput = get("productCostPrice").value;
        const priceInput = get("productPrice").value;
        const stockInput = get("productStock").value;

        const costPrice = Number(costPriceInput);
        const price = Number(priceInput);
        const stock = Number(stockInput);

        if (!name || costPriceInput === "" || priceInput === "" ||
            stockInput === "" || !Number.isFinite(costPrice) ||
            !Number.isFinite(price) || costPrice <= 0 || price <= 0 ||
            stock < 0 || !Number.isInteger(stock)) {
            message.textContent =
                "Please enter valid buying price, selling price and stock.";
            return;
        }

        if (price < costPrice && !confirm(
            "Warning: Selling price is lower than buying cost. Continue?"
        )) return;

        message.textContent = "Adding product...";

        const { error } = await db.from("products").insert([{
            name,
            description,
            cost_price: costPrice,
            price,
            stock
        }]);

        if (error) {
            message.textContent = "Failed to add product: " + error.message;
            return;
        }

        message.textContent = "Product added successfully!";
        this.reset();
        await loadProducts();
    });

    // =====================================
    // LOAD PRODUCTS
    // =====================================

    async function loadProducts() {
        const container = get("products");
        const saleProduct = get("saleProduct");

        const { data, error } = await db.from("products")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            container.textContent = "Failed to load products: " + error.message;
            return;
        }

        saleProduct.innerHTML = "";

        const firstOption = document.createElement("option");
        firstOption.value = "";
        firstOption.textContent = "Choose a product";
        saleProduct.appendChild(firstOption);

        (data || []).forEach(product => {
            const option = document.createElement("option");
            option.value = product.id;
            option.textContent = product.name + " - Stock: " + product.stock;
            saleProduct.appendChild(option);
        });

        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.textContent = "No products added yet.";
            return;
        }

        data.forEach(product => {
            const card = document.createElement("div");
            card.className = "product-card";

            const heading = document.createElement("h3");
            heading.textContent = product.name;

            const description = document.createElement("p");
            description.textContent = "Description: " + (product.description || "");

            const cost = document.createElement("p");
            const price = document.createElement("p");
            const profit = document.createElement("p");

            price.textContent = "Selling price: KSh " + money(product.price);

            if (product.cost_price !== null && product.cost_price !== undefined) {
                const buyingCost = Number(product.cost_price);
                const sellingPrice = Number(product.price);

                cost.textContent = "Average buying cost: KSh " + money(buyingCost);
                profit.textContent = "Profit per item: KSh " +
                    money(sellingPrice - buyingCost);
            } else {
                cost.textContent = "Average buying cost: Not entered yet";
                profit.textContent = "Profit per item: Not available";
            }

            const stock = document.createElement("p");
            stock.textContent = "Stock: " + product.stock;

            const stockStatus = document.createElement("p");

            if (Number(product.stock) === 0) {
                stockStatus.textContent = "OUT OF STOCK";
            } else if (Number(product.stock) <= LOW_STOCK_LEVEL) {
                stockStatus.textContent = "LOW STOCK";
            } else {
                stockStatus.textContent = "IN STOCK";
            }

            const restockButton = document.createElement("button");
            restockButton.textContent = "Restock Product";
            restockButton.onclick = () => restockProduct(product);

            const editButton = document.createElement("button");
            editButton.textContent = "Edit Product";
            editButton.onclick = () => editProduct(card, product);

            const deleteButton = document.createElement("button");
            deleteButton.textContent = "Delete Product";
            deleteButton.onclick = () => deleteProduct(product.id, product.name);

            card.append(
                heading, description, cost, price, profit,
                stock, stockStatus, restockButton, editButton, deleteButton
            );

            container.appendChild(card);
        });
    }

    // =====================================
    // SMART RESTOCK
    // =====================================

    async function restockProduct(product) {
        const quantityAnswer = prompt(
            "How many units are you adding to " + product.name + "?"
        );

        if (quantityAnswer === null) return;

        const quantity = Number(quantityAnswer);

        if (quantityAnswer.trim() === "" ||
            !Number.isInteger(quantity) || quantity <= 0) {
            alert("Please enter a valid whole number greater than zero.");
            return;
        }

        const costAnswer = prompt(
            "Buying price for ONE " + product.name + " (KSh)?"
        );

        if (costAnswer === null) return;

        const unitCost = Number(costAnswer);

        if (costAnswer.trim() === "" ||
            !Number.isFinite(unitCost) || unitCost <= 0) {
            alert("Please enter a valid buying price greater than zero.");
            return;
        }

        if (!confirm(
            "Confirm restock:\n\nProduct: " + product.name +
            "\nQuantity: " + quantity +
            "\nBuying price per item: KSh " + money(unitCost) +
            "\nTotal purchase cost: KSh " + money(quantity * unitCost)
        )) return;

        const message = get("productMessage");
        message.textContent = "Recording restock...";

        const { data, error } = await db.rpc("record_restock", {
            p_product_id: product.id,
            p_quantity: quantity,
            p_unit_cost: unitCost
        });

        if (error) {
            message.textContent = "Restocking failed: " + error.message;
            alert("Restocking failed: " + error.message);
            return;
        }

        const updatedProduct = Array.isArray(data) ? data[0] : data;

        message.textContent = product.name + " restocked successfully!";

        if (updatedProduct) {
            alert(
                "Restock successful!\n\nProduct: " + updatedProduct.name +
                "\nNew stock: " + updatedProduct.stock +
                "\nAverage buying cost: KSh " +
                money(updatedProduct.cost_price)
            );
        } else {
            alert("Restock successful!");
        }

        await loadProducts();
    }

    // =====================================
    // EDIT PRODUCT
    // =====================================

    function editProduct(card, product) {
        card.innerHTML = "";

        const nameInput = document.createElement("input");
        nameInput.value = product.name;
        nameInput.placeholder = "Product name";

        const descriptionInput = document.createElement("input");
        descriptionInput.value = product.description || "";
        descriptionInput.placeholder = "Description";

        const priceInput = document.createElement("input");
        priceInput.type = "number";
        priceInput.min = "0.01";
        priceInput.step = "0.01";
        priceInput.value = product.price;

        const stockInput = document.createElement("input");
        stockInput.type = "number";
        stockInput.min = "0";
        stockInput.step = "1";
        stockInput.value = product.stock;

        const saveButton = document.createElement("button");
        saveButton.textContent = "Save Changes";

        const cancelButton = document.createElement("button");
        cancelButton.textContent = "Cancel";

        card.append(
            nameInput, descriptionInput, priceInput,
            stockInput, saveButton, cancelButton
        );

        saveButton.onclick = async function () {
            const name = nameInput.value.trim();
            const description = descriptionInput.value.trim();
            const price = Number(priceInput.value);
            const stock = Number(stockInput.value);

            if (!name || priceInput.value === "" ||
                stockInput.value === "" || !Number.isFinite(price) ||
                price <= 0 || stock < 0 || !Number.isInteger(stock)) {
                alert("Please enter valid product details.");
                return;
            }

            saveButton.disabled = true;
            saveButton.textContent = "Saving...";

            const { data, error } = await db.from("products")
                .update({ name, description, price, stock })
                .eq("id", product.id)
                .select("id")
                .maybeSingle();

            if (error || !data) {
                alert("Product update failed: " +
                    (error ? error.message : "No product updated."));
                saveButton.disabled = false;
                saveButton.textContent = "Save Changes";
                return;
            }

            get("productMessage").textContent = "Product updated successfully!";
            await loadProducts();
        };

        cancelButton.onclick = () => loadProducts();
    }

    // =====================================
    // DELETE PRODUCT
    // =====================================

    async function deleteProduct(productId, productName) {
        if (!confirm('Are you sure you want to delete "' + productName + '"?')) {
            return;
        }

        const { error } = await db.from("products")
            .delete()
            .eq("id", productId);

        if (error) {
            alert("Failed to delete product: " + error.message);
            return;
        }

        get("productMessage").textContent = "Product deleted successfully!";
        await loadProducts();
    }

    // =====================================
    // RECORD SALE
    // =====================================

    get("saleForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const productId = get("saleProduct").value;
        const quantity = Number(get("saleQuantity").value);
        const message = get("saleMessage");

        if (!productId || !Number.isInteger(quantity) || quantity <= 0) {
            message.textContent = "Select a product and enter a valid quantity.";
            return;
        }

        const button = this.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "Recording Sale...";

        try {
            const { error } = await db.rpc("record_sale", {
                p_product_id: productId,
                p_quantity: quantity
            });

            if (error) {
                message.textContent = "Sale failed: " + error.message;
                return;
            }

            message.textContent = "Sale recorded successfully! Stock reduced.";
            this.reset();

            await loadProducts();
            await loadSales();
            await loadDailySalesSummary();
            await loadMonthlySalesSummary();
            await loadFinancialReports();

        } catch (error) {
            message.textContent = "Sale failed: " + error.message;

        } finally {
            button.disabled = false;
            button.textContent = "Record Sale";
        }
    });

    // =====================================
    // SHOP EXPENSES
    // =====================================

    get("expenseForm").addEventListener("submit", async function (e) {
        e.preventDefault();

        const message = get("expenseMessage");
        const description = get("expenseDescription").value.trim();
        const category = get("expenseCategory").value;
        const amountInput = get("expenseAmount").value;
        const amount = Number(amountInput);

        if (!description || !category || amountInput === "" ||
            !Number.isFinite(amount) || amount <= 0) {
            message.textContent = "Enter a description, category and valid amount.";
            return;
        }

        const button = this.querySelector('button[type="submit"]');
        button.disabled = true;
        button.textContent = "Saving Expense...";
        message.textContent = "Recording expense...";

        try {
            const { error } = await db.from("expenses").insert([{
                description,
                category,
                amount
            }]);

            if (error) {
                message.textContent = "Failed to record expense: " + error.message;
                return;
            }

            message.textContent = "Expense recorded successfully!";
            this.reset();

            await loadExpenses();
            await loadFinancialReports();

        } catch (error) {
            message.textContent = "Expense error: " + error.message;

        } finally {
            button.disabled = false;
            button.textContent = "Record Expense";
        }
    });

    // =====================================
    // LOAD EXPENSE HISTORY
    // =====================================

    async function loadExpenses() {
        const container = get("expenses");

        const { data, error } = await db.from("expenses")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            container.textContent = "Failed to load expenses: " + error.message;
            console.error(error.message);
            return;
        }

        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.textContent = "No expenses recorded yet.";
            return;
        }

        data.forEach(expense => {
            const card = document.createElement("div");
            card.className = "expense-card";

            const heading = document.createElement("h3");
            heading.textContent = expense.description;

            const category = document.createElement("p");
            category.textContent = "Category: " + (expense.category || "Other");

            const amount = document.createElement("p");
            amount.textContent = "Amount: KSh " + money(expense.amount);

            const date = document.createElement("p");
            date.textContent = "Date: " +
                new Date(expense.created_at).toLocaleString(
                    "en-KE", { timeZone: SHOP_TIMEZONE }
                );

            card.append(heading, category, amount, date);
            container.appendChild(card);
        });
    }

    // =====================================
    // SALES HISTORY
    // =====================================

    async function loadSales() {
        const container = get("sales");

        const { data, error } = await db.from("sales")
            .select("*")
            .order("created_at", { ascending: false });

        if (error) {
            container.textContent = "Failed to load sales: " + error.message;
            return;
        }

        container.innerHTML = "";

        if (!data || data.length === 0) {
            container.textContent = "No sales recorded yet.";
            return;
        }

        data.forEach(sale => {
            const card = document.createElement("div");
            card.className = "sale-card";

            const heading = document.createElement("h3");
            heading.textContent = sale.product_name;

            const quantity = document.createElement("p");
            quantity.textContent = "Quantity sold: " + sale.quantity;

            const price = document.createElement("p");
            price.textContent = "Selling price per item: KSh " + money(sale.price);

            const total = document.createElement("p");
            total.textContent = "Sales total: KSh " + money(sale.total);

            const cost = document.createElement("p");
            const profit = document.createElement("p");

            if (sale.cost_price !== null && sale.cost_price !== undefined) {
                const costTotal = Number(sale.cost_price) * Number(sale.quantity);
                cost.textContent = "Buying cost: KSh " + money(costTotal);
                profit.textContent = "Gross profit: KSh " +
                    money(Number(sale.total) - costTotal);
            } else {
                cost.textContent = "Buying cost: Not recorded for this sale";
                profit.textContent = "Gross profit: Not available";
            }

            const date = document.createElement("p");
            date.textContent = "Date: " +
                new Date(sale.created_at).toLocaleString(
                    "en-KE", { timeZone: SHOP_TIMEZONE }
                );

            card.append(heading, quantity, price, total, cost, profit, date);
            container.appendChild(card);
        });
    }

    // =====================================
    // DAILY SALES SUMMARY
    // =====================================

    async function loadDailySalesSummary() {
        const totalElement = get("totalSalesToday");
        const itemsElement = get("itemsSoldToday");
        const transactionsElement = get("transactionsToday");

        const { data, error } = await db.from("sales")
            .select("created_at, quantity, total");

        if (error) {
            totalElement.textContent = "Could not load";
            itemsElement.textContent = "Could not load";
            transactionsElement.textContent = "Could not load";
            console.error(error.message);
            return;
        }

        const todayKey = getKenyaDateKey(new Date());
        const sales = (data || []).filter(sale =>
            getKenyaDateKey(new Date(sale.created_at)) === todayKey
        );

        totalElement.textContent = money(
            sales.reduce((sum, sale) => sum + Number(sale.total), 0)
        );

        itemsElement.textContent = sales.reduce(
            (sum, sale) => sum + Number(sale.quantity), 0
        );

        transactionsElement.textContent = sales.length;
    }

    // =====================================
    // MONTHLY SALES SUMMARY
    // =====================================

    async function loadMonthlySalesSummary() {
        const totalElement = get("totalSalesMonth");
        const itemsElement = get("itemsSoldMonth");
        const transactionsElement = get("transactionsMonth");

        const { data, error } = await db.from("sales")
            .select("created_at, quantity, total");

        if (error) {
            totalElement.textContent = "Could not load";
            itemsElement.textContent = "Could not load";
            transactionsElement.textContent = "Could not load";
            console.error(error.message);
            return;
        }

        const monthKey = getKenyaMonthKey(new Date());
        const sales = (data || []).filter(sale =>
            getKenyaMonthKey(new Date(sale.created_at)) === monthKey
        );

        totalElement.textContent = money(
            sales.reduce((sum, sale) => sum + Number(sale.total), 0)
        );

        itemsElement.textContent = sales.reduce(
            (sum, sale) => sum + Number(sale.quantity), 0
        );

        transactionsElement.textContent = sales.length;
    }

    // =====================================
    // FINANCIAL REPORTS SECTION
    // =====================================

    function createFinancialReportsSection() {
        if (get("financialReports")) return;

        const section = document.createElement("section");
        section.id = "financialReports";

        const heading = document.createElement("h2");
        heading.textContent = "Financial Reports";

        const description = document.createElement("p");
        description.textContent =
            "See your daily and monthly shop financial performance.";

        const dailyHeading = document.createElement("h3");
        dailyHeading.textContent = "Today's Financial Report";

        const dailyRevenue = document.createElement("p");
        dailyRevenue.innerHTML =
            'Sales Revenue: KSh <span id="dailyRevenue">0.00</span>';

        const dailyGross = document.createElement("p");
        dailyGross.innerHTML =
            'Known Gross Profit: KSh <span id="dailyGrossProfit">0.00</span>';

        const dailyExpenses = document.createElement("p");
        dailyExpenses.innerHTML =
            'Shop Expenses: KSh <span id="dailyExpenses">0.00</span>';

        const dailyNet = document.createElement("p");
        dailyNet.innerHTML =
            'Known Net Profit: KSh <span id="dailyNetProfit">0.00</span>';

        const dailyStatus = document.createElement("p");
        dailyStatus.id = "dailyProfitStatus";

        const divider = document.createElement("hr");

        const monthlyHeading = document.createElement("h3");
        monthlyHeading.textContent = "This Month's Financial Report";

        const monthlyRevenue = document.createElement("p");
        monthlyRevenue.innerHTML =
            'Sales Revenue: KSh <span id="monthlyRevenue">0.00</span>';

        const monthlyGross = document.createElement("p");
        monthlyGross.innerHTML =
            'Known Gross Profit: KSh <span id="monthlyGrossProfit">0.00</span>';

        const monthlyExpenses = document.createElement("p");
        monthlyExpenses.innerHTML =
            'Shop Expenses: KSh <span id="monthlyExpenses">0.00</span>';

        const monthlyNet = document.createElement("p");
        monthlyNet.innerHTML =
            'Known Net Profit: KSh <span id="monthlyNetProfit">0.00</span>';

        const monthlyStatus = document.createElement("p");
        monthlyStatus.id = "monthlyProfitStatus";

        const refreshButton = document.createElement("button");
        refreshButton.type = "button";
        refreshButton.textContent = "Refresh Financial Reports";
        refreshButton.addEventListener("click", loadFinancialReports);

        section.append(
            heading, description,
            dailyHeading, dailyRevenue, dailyGross,
            dailyExpenses, dailyNet, dailyStatus,
            divider,
            monthlyHeading, monthlyRevenue, monthlyGross,
            monthlyExpenses, monthlyNet, monthlyStatus,
            refreshButton
        );

        get("adminDashboard").appendChild(section);
    }

    // =====================================
    // LOAD FINANCIAL REPORTS
    // =====================================

    async function loadFinancialReports() {
        const ids = [
            "dailyRevenue", "dailyGrossProfit", "dailyExpenses",
            "dailyNetProfit", "monthlyRevenue", "monthlyGrossProfit",
            "monthlyExpenses", "monthlyNetProfit"
        ];

        ids.forEach(id => {
            if (get(id)) get(id).textContent = "Loading...";
        });

        const dailyStatus = get("dailyProfitStatus");
        const monthlyStatus = get("monthlyProfitStatus");

        if (dailyStatus) dailyStatus.textContent = "Loading reports...";
        if (monthlyStatus) monthlyStatus.textContent = "Loading reports...";

        try {
            const [salesResult, expensesResult] = await Promise.all([
                db.from("sales").select("created_at, quantity, total, cost_price"),
                db.from("expenses").select("created_at, amount")
            ]);

            if (salesResult.error) throw salesResult.error;
            if (expensesResult.error) throw expensesResult.error;

            const sales = salesResult.data || [];
            const expenses = expensesResult.data || [];

            const todayKey = getKenyaDateKey(new Date());
            const monthKey = getKenyaMonthKey(new Date());

            function calculatePeriod(periodSales, periodExpenses) {
                let revenue = 0;
                let grossProfit = 0;
                let missingCostSales = 0;

                periodSales.forEach(sale => {
                    const total = Number(sale.total) || 0;
                    const quantity = Number(sale.quantity) || 0;

                    revenue += total;

                    if (sale.cost_price === null ||
                        sale.cost_price === undefined) {
                        missingCostSales++;
                    } else {
                        grossProfit += total -
                            (Number(sale.cost_price) * quantity);
                    }
                });

                const expenseTotal = periodExpenses.reduce(
                    (sum, expense) => sum + Number(expense.amount || 0), 0
                );

                return {
                    revenue,
                    grossProfit,
                    expenses: expenseTotal,
                    netProfit: grossProfit - expenseTotal,
                    missingCostSales
                };
            }

            const dailySales = sales.filter(sale =>
                getKenyaDateKey(new Date(sale.created_at)) === todayKey
            );

            const dailyExpenses = expenses.filter(expense =>
                getKenyaDateKey(new Date(expense.created_at)) === todayKey
            );

            const monthlySales = sales.filter(sale =>
                getKenyaMonthKey(new Date(sale.created_at)) === monthKey
            );

            const monthlyExpenses = expenses.filter(expense =>
                getKenyaMonthKey(new Date(expense.created_at)) === monthKey
            );

            const daily = calculatePeriod(dailySales, dailyExpenses);
            const monthly = calculatePeriod(monthlySales, monthlyExpenses);

            function displayReport(prefix, report) {
                get(prefix + "Revenue").textContent = money(report.revenue);
                get(prefix + "GrossProfit").textContent = money(report.grossProfit);
                get(prefix + "Expenses").textContent = money(report.expenses);
                get(prefix + "NetProfit").textContent = money(report.netProfit);

                const status = get(prefix + "ProfitStatus");

                status.textContent = report.missingCostSales > 0
                    ? "INCOMPLETE: " + report.missingCostSales +
                      " sale(s) have no recorded buying cost. Profit shows known amounts only."
                    : "Complete: buying costs are recorded for all sales.";
            }

            displayReport("daily", daily);
            displayReport("monthly", monthly);

        } catch (error) {
            console.error("Financial report error:", error);

            if (dailyStatus) {
                dailyStatus.textContent =
                    "Could not load daily report: " + error.message;
            }

            if (monthlyStatus) {
                monthlyStatus.textContent =
                    "Could not load monthly report: " + error.message;
            }

            ids.forEach(id => {
                if (get(id)) get(id).textContent = "Unavailable";
            });
        }
    }

    // =====================================
    // LOGOUT
    // =====================================

    get("logoutButton").addEventListener("click", async function () {
        await db.auth.signOut();
        showDashboard(false);
    });

    // =====================================
    // START DASHBOARD
    // =====================================

    async function startDashboard() {
        try {
            const { data, error } = await db.auth.getSession();

            if (error) {
                console.error("Session error:", error.message);
                showDashboard(false);
                return;
            }

            if (!data.session) {
                showDashboard(false);
                return;
            }

            showDashboard(true);
            createFinancialReportsSection();

            await loadOrders();
            await loadServices();
            await loadProducts();
            await loadSales();
            await loadExpenses();
            await loadDailySalesSummary();
            await loadMonthlySalesSummary();
            await loadFinancialReports();

        } catch (error) {
            console.error("Dashboard startup error:", error);
        }
    }

    startDashboard();

});
