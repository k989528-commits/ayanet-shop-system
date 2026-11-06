
// CONNECT AYANET TO SUPABASE
const db = window.supabase.createClient(
    "https://jltadhukraspfdaxbvwo.supabase.co",
    "sb_publishable_tItrrAg_q9xSCskecgc5Jg_bJkxsOiu"
);

// LOAD CUSTOMER ORDERS
async function loadOrders() {
    const { data, error } = await db
        .from("orders")
        .select("*")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error loading orders:", error);
        return;
    }

    console.log("Customer Orders:", data);
}

// AYANET SERVICES
const services = [
    { name: "Printing", description: "Print documents and assignments." },
    { name: "Photocopy & Scanning", description: "Copy and scan your documents." },
    { name: "Online Applications", description: "Get help with online applications." },
    { name: "CV Writing & Typing", description: "CV writing, typing and editing." },
    { name: "Books & Stationery", description: "Order books and stationery." },
    { name: "Phone Repair", description: "Request phone repair services." }
];

// DISPLAY SERVICES
const serviceContainer = document.getElementById("services");

if (serviceContainer) {
    serviceContainer.innerHTML = services.map(service => `
        <div class="service-card">
            <h3>${service.name}</h3>
            <p>${service.description}</p>
        </div>
    `).join("");
}

// SUBMIT CUSTOMER ORDERS
const orderForm = document.getElementById("orderForm");

if (orderForm) {
    orderForm.addEventListener("submit", async function(event) {
        event.preventDefault();

        const message = document.getElementById("orderMessage");
        const submitButton = orderForm.querySelector("button[type='submit']");

        submitButton.disabled = true;
        message.textContent = "Submitting your order...";

        const order = {
            customer_name: document.getElementById("customerName").value.trim(),
            customer_phone: document.getElementById("customerPhone").value.trim(),
            service_name: document.getElementById("serviceName").value,
            order_details: document.getElementById("orderDetails").value.trim()
        };

        try {
            const { error } = await db.from("orders").insert([order]);

            if (error) throw error;

            message.textContent = "Your order has been submitted successfully!";
            orderForm.reset();

        } catch (error) {
            console.error(error);
            message.textContent = "Sorry, your order could not be submitted. Please try again.";

        } finally {
            submitButton.disabled = false;
        }
    });
}

// RUN ORDER LOADING ON ADMIN DASHBOARD
if (document.getElementById("orders")) {
    loadOrders();
}
