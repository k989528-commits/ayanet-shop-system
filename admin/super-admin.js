
/* =========================================
   AYANET SUPER ADMIN CONTROL CENTRE
   Shop registration and approval
========================================= */

document.addEventListener("DOMContentLoaded", function () {
    const db = window.supabase.createClient(
        "https://jltadhukraspfdaxbvwo.supabase.co",
        "sb_publishable_tItrrAg_q9xSCskecgc5Jg_bJkxsOiu"
    );

    let controlCentre = null;

    function createControlCentre() {
        if (controlCentre) return;

        controlCentre = document.createElement("section");
        controlCentre.id = "ayanetSuperAdmin";
        controlCentre.style.cssText = `
            margin:25px 0;
            padding:20px;
            border:2px solid #c9a227;
            border-radius:12px;
            background:#101d35;
            color:white;
        `;

        controlCentre.innerHTML = `
            <h2>AYANET SUPER ADMIN</h2>
            <p>Platform Control Centre</p>
            <hr>
            <h3>Registered Shops</h3>
            <p id="superAdminMessage">Loading registered shops...</p>
            <div id="superAdminShopList"></div>
            <button type="button" id="refreshShopList">
                Refresh Shop List
            </button>
        `;

        const dashboard = document.getElementById("adminDashboard");
        dashboard.insertBefore(controlCentre, dashboard.firstChild);

        document.getElementById("refreshShopList")
            .addEventListener("click", loadRegisteredShops);
    }

    async function loadRegisteredShops() {
        const message = document.getElementById("superAdminMessage");
        const list = document.getElementById("superAdminShopList");

        message.textContent = "Loading shops...";
        list.innerHTML = "";

        const { data, error } = await db.rpc(
            "get_shop_registrations"
        );

        if (error) {
            message.textContent =
                "Could not load shops: " + error.message;
            return;
        }

        if (!data || data.length === 0) {
            message.textContent = "No registered shops found.";
            return;
        }

        message.textContent =
            "Registered shops: " + data.length;

        data.forEach(shop => {
            const card = document.createElement("div");

            card.style.cssText = `
                background:white;
                color:#17243b;
                padding:15px;
                margin:12px 0;
                border-radius:8px;
            `;

            const heading = document.createElement("h3");
            heading.textContent = shop.shop_name;

            const owner = document.createElement("p");
            owner.textContent =
                "Owner: " + (shop.owner_email || "Not available");

            const status = document.createElement("p");
            status.textContent =
                "Status: " + String(shop.shop_status).toUpperCase();

            const date = document.createElement("p");
            date.textContent =
                "Registered: " +
                new Date(shop.registration_date).toLocaleString();

            card.append(heading, owner, status, date);

            if (shop.shop_status !== "active") {
                const approve = document.createElement("button");
                approve.type = "button";
                approve.textContent = "Approve Shop";

                approve.addEventListener("click", () => {
                    reviewShop(shop.shop_id, "active");
                });

                card.appendChild(approve);
            }

            if (shop.shop_status !== "suspended") {
                const suspend = document.createElement("button");
                suspend.type = "button";
                suspend.textContent = "Suspend Shop";

                suspend.addEventListener("click", () => {
                    reviewShop(shop.shop_id, "suspended");
                });

                card.appendChild(suspend);
            }

            list.appendChild(card);
        });
    }

    async function reviewShop(shopId, decision) {
        const action = decision === "active" ? "approve" : "suspend";

        if (!confirm("Are you sure you want to " + action + " this shop?")) {
            return;
        }

        const message = document.getElementById("superAdminMessage");
        message.textContent = "Updating shop status...";

        const { error } = await db.rpc("review_shop_registration", {
            p_shop_id: shopId,
            p_decision: decision
        });

        if (error) {
            message.textContent =
                "Shop update failed: " + error.message;
            return;
        }

        message.textContent =
            "Shop successfully " +
            (decision === "active" ? "approved." : "suspended.");

        await loadRegisteredShops();
    }

    async function checkSuperAdmin() {
        const { data: sessionData, error: sessionError } =
            await db.auth.getSession();

        if (sessionError || !sessionData.session) return;

        const { data, error } = await db.rpc(
            "get_shop_registrations"
        );

        // Ordinary shop administrators do not see this panel.
        if (error) return;

        createControlCentre();

        const message = document.getElementById("superAdminMessage");
        message.textContent = "Super Admin access verified.";

        renderShops(data || []);
    }

    function renderShops(shops) {
        const list = document.getElementById("superAdminShopList");
        const message = document.getElementById("superAdminMessage");

        list.innerHTML = "";
        message.textContent = "Registered shops: " + shops.length;

        shops.forEach(shop => {
            const card = document.createElement("div");

            card.style.cssText = `
                background:white;
                color:#17243b;
                padding:15px;
                margin:12px 0;
                border-radius:8px;
            `;

            const heading = document.createElement("h3");
            heading.textContent = shop.shop_name;

            const owner = document.createElement("p");
            owner.textContent =
                "Owner: " + (shop.owner_email || "Not available");

            const status = document.createElement("p");
            status.textContent =
                "Status: " + String(shop.shop_status).toUpperCase();

            const date = document.createElement("p");
            date.textContent =
                "Registered: " +
                new Date(shop.registration_date).toLocaleString();

            card.append(heading, owner, status, date);

            if (shop.shop_status !== "active") {
                const approve = document.createElement("button");
                approve.textContent = "Approve Shop";
                approve.addEventListener("click", () =>
                    reviewShop(shop.shop_id, "active")
                );
                card.appendChild(approve);
            }

            if (shop.shop_status !== "suspended") {
                const suspend = document.createElement("button");
                suspend.textContent = "Suspend Shop";
                suspend.addEventListener("click", () =>
                    reviewShop(shop.shop_id, "suspended")
                );
                card.appendChild(suspend);
            }

            list.appendChild(card);
        });
    }

    db.auth.onAuthStateChange((event, session) => {
        if (session) {
            setTimeout(checkSuperAdmin, 0);
        } else if (controlCentre) {
            controlCentre.remove();
            controlCentre = null;
        }
    });

    checkSuperAdmin();
});
