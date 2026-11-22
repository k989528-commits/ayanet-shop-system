
/* =====================================
   AYANET MULTI-SHOP SALES CART
   SHOP-SPECIFIC PRODUCTS
   STOCK VALIDATION
   MULTI-PRODUCT SALES
   PDF RECEIPTS
   KENYA DATE AND TIME
===================================== */

document.addEventListener("DOMContentLoaded", function () {

    const db = window.supabase.createClient(
        "https://jltadhukraspfdaxbvwo.supabase.co",
        "sb_publishable_tItrrAg_q9xSCskecgc5Jg_bJkxsOiu"
    );

    const get = id => document.getElementById(id);

    let products = [];
    let cart = [];
    let lastReceipt = null;
    let savingSale = false;
    let loadingShopId = null;

    function currentShopId() {
        return window.AYANET_CURRENT_SHOP_ID || null;
    }

    function money(value) {
        return Number(value || 0).toFixed(2);
    }

    function kenyaDateTime() {
        return new Intl.DateTimeFormat("en-KE", {
            timeZone: "Africa/Nairobi",
            dateStyle: "medium",
            timeStyle: "short"
        }).format(new Date());
    }

    function makeReceiptNumber() {
        const date = new Intl.DateTimeFormat("en-CA", {
            timeZone: "Africa/Nairobi",
            year: "numeric",
            month: "2-digit",
            day: "2-digit"
        }).format(new Date()).replace(/-/g, "");

        const random = Math.random().toString(36)
            .substring(2, 8).toUpperCase();

        return "AY-" + date + "-" + random;
    }

    function showMessage(message) {
        const element = get("cartSaleMessage");
        if (element) element.textContent = message;
    }

    function calculateTotal() {
        return cart.reduce(
            (sum, item) => sum + item.price * item.quantity,
            0
        );
    }

    function renderCart() {
        const container = get("salesCartItems");
        const totalElement = get("salesCartTotal");

        if (!container || !totalElement) return;

        container.innerHTML = "";

        if (!cart.length) {
            container.textContent = "No products added yet.";
            totalElement.textContent = "0.00";
            return;
        }

        cart.forEach((item, index) => {
            const card = document.createElement("div");
            card.className = "cart-item";

            const name = document.createElement("h4");
            name.textContent = item.name;

            const details = document.createElement("p");
            details.textContent =
                item.quantity + " × KSh " + money(item.price) +
                " = KSh " + money(item.quantity * item.price);

            const changeButton = document.createElement("button");
            changeButton.type = "button";
            changeButton.textContent = "Change Quantity";

            changeButton.onclick = function () {
                const answer = prompt(
                    "Enter new quantity for " + item.name + ":",
                    item.quantity
                );

                if (answer === null) return;

                const quantity = Number(answer);

                if (!Number.isInteger(quantity) || quantity <= 0) {
                    alert("Enter a valid whole number greater than zero.");
                    return;
                }

                const product = products.find(
                    p => String(p.id) === String(item.product_id)
                );

                if (!product) {
                    showMessage("This product is no longer available.");
                    return;
                }

                const otherQuantity = cart.reduce((sum, other, i) => {
                    return i !== index &&
                        String(other.product_id) === String(item.product_id)
                        ? sum + other.quantity : sum;
                }, 0);

                if (quantity + otherQuantity > Number(product.stock)) {
                    alert("Not enough stock. Available: " + product.stock);
                    return;
                }

                item.quantity = quantity;
                renderCart();
            };

            const removeButton = document.createElement("button");
            removeButton.type = "button";
            removeButton.textContent = "Remove";

            removeButton.onclick = function () {
                cart.splice(index, 1);
                renderCart();
            };

            card.append(name, details, changeButton, removeButton);
            container.appendChild(card);
        });

        totalElement.textContent = money(calculateTotal());
    }

    async function loadCartProducts() {
        const select = get("cartProduct");
        if (!select) return;

        const shopId = currentShopId();

        products = [];
        select.innerHTML = "";

        const first = document.createElement("option");
        first.value = "";

        if (!shopId) {
            first.textContent = "Select a shop first";
            select.appendChild(first);
            showMessage("Waiting for your shop selection...");
            return;
        }

        first.textContent = "Loading products...";
        select.appendChild(first);

        loadingShopId = shopId;

        try {
            const { data, error } = await db
                .from("products")
                .select("id, name, price, stock, shop_id")
                .eq("shop_id", shopId)
                .order("name");

            if (error) throw error;

            if (currentShopId() !== shopId) return;

            products = data || [];

            select.innerHTML = "";

            const option = document.createElement("option");
            option.value = "";
            option.textContent = "Choose a product";
            select.appendChild(option);

            products.forEach(product => {
                const productOption = document.createElement("option");
                productOption.value = product.id;
                productOption.textContent =
                    product.name + " — Stock: " + product.stock +
                    " — KSh " + money(product.price);

                select.appendChild(productOption);
            });

            if (!products.length) {
                showMessage("No products found in this shop.");
            } else {
                showMessage("Shop products loaded. You can add items.");
            }

        } catch (error) {
            if (currentShopId() !== shopId) return;

            select.innerHTML =
                '<option value="">Could not load products</option>';

            showMessage("Product loading failed: " + error.message);

        } finally {
            if (loadingShopId === shopId) {
                loadingShopId = null;
            }
        }
    }

    function addCartItem() {
        if (!currentShopId()) {
            showMessage("Select a shop before adding products.");
            return;
        }

        const productSelect = get("cartProduct");
        const quantityElement = get("cartQuantity");

        if (!productSelect || !quantityElement) return;

        const productId = productSelect.value;
        const quantity = Number(quantityElement.value);

        if (!productId) {
            showMessage("Please choose a product.");
            return;
        }

        if (!Number.isInteger(quantity) || quantity <= 0) {
            showMessage("Enter a valid whole-number quantity.");
            return;
        }

        const product = products.find(
            item => String(item.id) === String(productId)
        );

        if (!product) {
            showMessage("Product not found. Refresh the product list.");
            return;
        }

        const existing = cart.find(
            item => String(item.product_id) === String(product.id)
        );

        const requestedQuantity =
            quantity + (existing ? existing.quantity : 0);

        if (requestedQuantity > Number(product.stock)) {
            showMessage(
                "Not enough stock for " + product.name +
                ". Available stock: " + product.stock
            );
            return;
        }

        if (existing) {
            existing.quantity += quantity;
        } else {
            cart.push({
                product_id: product.id,
                name: product.name,
                price: Number(product.price),
                quantity: quantity
            });
        }

        quantityElement.value = "1";
        productSelect.value = "";

        showMessage(product.name + " added to cart.");
        renderCart();
    }

    function downloadReceipt() {
        if (!lastReceipt) {
            showMessage("There is no completed receipt to download.");
            return;
        }

        try {
            if (!window.jspdf || !window.jspdf.jsPDF) {
                throw new Error("PDF service is unavailable.");
            }

            const { jsPDF } = window.jspdf;
            const doc = new jsPDF();
            const receipt = lastReceipt;
            const pageWidth = doc.internal.pageSize.getWidth();

            doc.setFont("helvetica", "bold");
            doc.setFontSize(22);
            doc.text("AYANET", pageWidth / 2, 20, {
                align: "center"
            });

            doc.setFontSize(12);
            doc.text("SHOP MANAGEMENT", pageWidth / 2, 28, {
                align: "center"
            });

            doc.setFont("helvetica", "normal");
            doc.setFontSize(10);
            doc.text("SALES RECEIPT", pageWidth / 2, 36, {
                align: "center"
            });

            doc.line(15, 42, pageWidth - 15, 42);

            let y = 51;

            doc.text("Receipt No: " + receipt.number, 15, y);
            y += 7;

            if (receipt.shopName) {
                doc.text("Shop: " + receipt.shopName, 15, y);
                y += 7;
            }

            doc.text("Date: " + receipt.date, 15, y);
            y += 7;

            doc.text(
                "Customer: " + (receipt.customer || "Walk-in Customer"),
                15, y
            );

            y += 12;

            doc.setFont("helvetica", "bold");
            doc.text("ITEM", 15, y);
            doc.text("QTY", 112, y);
            doc.text("PRICE", 135, y);
            doc.text("TOTAL", pageWidth - 15, y, {
                align: "right"
            });

            y += 3;
            doc.line(15, y, pageWidth - 15, y);
            y += 7;

            doc.setFont("helvetica", "normal");

            receipt.items.forEach(item => {
                if (y > 265) {
                    doc.addPage();
                    y = 20;
                }

                const itemName = doc.splitTextToSize(item.name, 85);

                doc.text(itemName, 15, y);
                doc.text(String(item.quantity), 112, y);
                doc.text(money(item.price), 135, y);
                doc.text(money(item.total), pageWidth - 15, y, {
                    align: "right"
                });

                y += Math.max(8, itemName.length * 5);
            });

            y += 5;
            doc.line(15, y, pageWidth - 15, y);
            y += 10;

            doc.setFont("helvetica", "bold");
            doc.setFontSize(13);

            doc.text(
                "GRAND TOTAL: KSh " + money(receipt.total),
                pageWidth - 15, y,
                { align: "right" }
            );

            y += 18;

            doc.setFont("helvetica", "normal");
            doc.setFontSize(11);

            doc.text(
                "Thank you for shopping with AYANET!",
                pageWidth / 2, y,
                { align: "center" }
            );

            y += 7;

            doc.text(
                "We appreciate your business.",
                pageWidth / 2, y,
                { align: "center" }
            );

            doc.save(receipt.number + ".pdf");
            showMessage("Receipt downloaded successfully.");

        } catch (error) {
            console.error("Receipt error:", error);
            showMessage("Receipt download failed: " + error.message);
        }
    }

    async function completeCartSale() {
        if (savingSale) return;

        const shopId = currentShopId();

        if (!shopId) {
            showMessage("Select a shop before recording sales.");
            return;
        }

        if (!cart.length) {
            showMessage("Your cart is empty. Add products first.");
            return;
        }

        const invalidItem = cart.some(item =>
            !products.some(product =>
                String(product.id) === String(item.product_id)
            )
        );

        if (invalidItem) {
            showMessage("The cart contains an item from another shop.");
            return;
        }

        const customerElement = get("cartCustomerName");
        const customer = customerElement
            ? customerElement.value.trim() : "";

        const total = calculateTotal();

        if (!confirm(
            "Confirm this AYANET sale?\n\n" +
            "Products: " + cart.length +
            "\nTotal: KSh " + money(total) +
            "\nCustomer: " + (customer || "Walk-in Customer")
        )) return;

        const button = get("completeCartSaleButton");
        savingSale = true;

        if (button) {
            button.disabled = true;
            button.textContent = "Saving Sale...";
        }

        showMessage("Recording your sale. Please wait...");

        const receiptNumber = makeReceiptNumber();

        const items = cart.map(item => ({
            product_id: item.product_id,
            quantity: item.quantity
        }));

        try {
            const { data, error } = await db.rpc("record_multi_sale", {
                p_items: items,
                p_receipt_number: receiptNumber
            });

            if (error) throw error;

            if (!data || !data.length) {
                throw new Error("The database returned no sale records.");
            }

            const savedItems = data.map(row => ({
                name: row.product_name,
                quantity: Number(row.quantity),
                price: Number(row.price),
                total: Number(row.total)
            }));

            const savedTotal = savedItems.reduce(
                (sum, item) => sum + item.total, 0
            );

            lastReceipt = {
                number: receiptNumber,
                date: kenyaDateTime(),
                customer: customer,
                shopName: window.AYANET_CURRENT_SHOP_NAME || "",
                items: savedItems,
                total: savedTotal
            };

            cart = [];
            renderCart();

            if (customerElement) customerElement.value = "";

            showMessage(
                "Sale saved successfully! Receipt: " + receiptNumber
            );

            downloadReceipt();
            await loadCartProducts();

            if (confirm(
                "Sale saved successfully.\n\n" +
                "Refresh the dashboard so stock and reports update?"
            )) {
                window.location.reload();
            }

        } catch (error) {
            console.error("Multi-product sale error:", error);
            showMessage("Sale could not be completed: " + error.message);

        } finally {
            savingSale = false;

            if (button) {
                button.disabled = false;
                button.textContent = "Complete Sale & Download Receipt";
            }
        }
    }

    const addButton = get("addCartItemButton");
    if (addButton) {
        addButton.addEventListener("click", addCartItem);
    }

    const completeButton = get("completeCartSaleButton");
    if (completeButton) {
        completeButton.addEventListener("click", completeCartSale);
    }

    const refreshButton = document.createElement("button");
    refreshButton.type = "button";
    refreshButton.textContent = "Load / Refresh Products";

    const productSelect = get("cartProduct");

    if (productSelect && productSelect.parentNode) {
        productSelect.parentNode.insertBefore(
            refreshButton,
            productSelect.nextSibling
        );

        refreshButton.addEventListener("click", loadCartProducts);
    }

    const downloadButton = get("downloadLastReceiptButton");
    if (downloadButton) {
        downloadButton.addEventListener("click", downloadReceipt);
    }

    /*
       IMPORTANT FIX:
       admin.js dispatches this event on WINDOW.
       The cart must therefore listen on WINDOW too.
    */
    window.addEventListener("ayanet-shop-changed", function () {
        cart = [];
        products = [];
        lastReceipt = null;

        renderCart();

        showMessage("Shop changed. Products are being refreshed.");
        loadCartProducts();
    });

    renderCart();

    db.auth.onAuthStateChange(function (event, session) {
        if (session && (
            event === "SIGNED_IN" ||
            event === "INITIAL_SESSION" ||
            event === "TOKEN_REFRESHED"
        )) {
            loadCartProducts();
        }
    });

});
