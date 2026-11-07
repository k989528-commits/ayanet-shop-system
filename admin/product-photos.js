document.addEventListener("DOMContentLoaded", function () {
    const db = window.supabase.createClient(
        "https://jltadhukraspfdaxbvwo.supabase.co",
        "sb_publishable_tItrrAg_q9xSCskecgc5Jg_bJkxsOiu"
    );

    const form = document.getElementById("productForm");
    const message = document.getElementById("productMessage");

    if (!form || !message) return;

    const label = document.createElement("label");
    label.textContent = "Choose Product Photo";

    const photoInput = document.createElement("input");
    photoInput.type = "file";
    photoInput.accept = "image/jpeg,image/png,image/webp";

    const preview = document.createElement("img");
    preview.style.maxWidth = "150px";
    preview.style.display = "none";

    const button = form.querySelector('button[type="submit"]');
    if (!button) return;

    form.insertBefore(label, button);
    form.insertBefore(photoInput, button);
    form.insertBefore(preview, button);

    photoInput.addEventListener("change", function () {
        const file = photoInput.files[0];
        if (!file) return;

        if (file.size > 5 * 1024 * 1024) {
            alert("Photo must be 5 MB or smaller.");
            photoInput.value = "";
            return;
        }

        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
    });

    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const file = photoInput.files[0];

        try {
            let imageUrl = null;

            if (file) {
                message.textContent = "Uploading photo...";

                const extension = file.type === "image/png" ? "png" :
                    file.type === "image/webp" ? "webp" : "jpg";

                const filename = Date.now() + "." + extension;

                const { error } = await db.storage
                    .from("product-photos")
                    .upload(filename, file);

                if (error) throw error;

                imageUrl = db.storage
                    .from("product-photos")
                    .getPublicUrl(filename).data.publicUrl;
            }

            message.textContent = "Saving product...";

            const { error } = await db.from("products").insert([{
                name: document.getElementById("productName").value.trim(),
                description: document.getElementById("productDescription").value.trim(),
                cost_price: Number(document.getElementById("productCostPrice").value),
                price: Number(document.getElementById("productPrice").value),
                stock: Number(document.getElementById("productStock").value),
                image_url: imageUrl
            }]);

            if (error) throw error;

            alert("Product saved successfully!");
            window.location.reload();

        } catch (error) {
            message.textContent = "Error: " + error.message;
        }
    }, true);
});
