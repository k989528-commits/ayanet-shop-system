
document.addEventListener("DOMContentLoaded", function () {
    const db = window.supabase.createClient(
        "https://jltadhukraspfdaxbvwo.supabase.co",
        "sb_publishable_tItrrAg_q9xSCskecgc5Jg_bJkxsOiu"
    );

    const form = document.getElementById("productForm");
    const productList = document.getElementById("products");
    const message = document.getElementById("productMessage");

    if (!form || !productList || !message) return;

    // PHOTO SELECTION
    const label = document.createElement("label");
    label.textContent = "Choose Product Photo";

    const photoInput = document.createElement("input");
    photoInput.type = "file";
    photoInput.accept = "image/jpeg,image/png,image/webp";
    photoInput.id = "productPhoto";
    photoInput.style.display = "block";
    photoInput.style.margin = "10px 0";

    const preview = document.createElement("img");
    preview.style.display = "none";
    preview.style.maxWidth = "160px";
    preview.style.maxHeight = "160px";
    preview.style.objectFit = "contain";

    const submitButton = form.querySelector('button[type="submit"]');

    if (!submitButton) return;

    form.insertBefore(label, submitButton);
    form.insertBefore(photoInput, submitButton);
    form.insertBefore(preview, submitButton);

    photoInput.addEventListener("change", function () {
        const file = photoInput.files[0];

        if (!file) return;

        if (!["image/jpeg", "image/png", "image/webp"].includes(file.type)) {
            alert("Choose a JPG, PNG or WEBP photo.");
            photoInput.value = "";
            preview.style.display = "none";
            return;
        }

        if (file.size > 5 * 1024 * 1024) {
            alert("Photo must be 5 MB or smaller.");
            photoInput.value = "";
            preview.style.display = "none";
            return;
        }

        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
    });

    // UPLOAD PHOTO TO SUPABASE
    async function uploadPhoto(file) {
        const extension = {
            "image/jpeg": "jpg",
            "image/png": "png",
            "image/webp": "webp"
        }[file.type];

        const filename =
            Date.now() + "-" +
            Math.random().toString(36).slice(2) +
            "." + extension;

        const { error } = await db.storage
            .from("product-photos")
            .upload(filename, file, {
                contentType: file.type,
                upsert: false
            });

        if (error) throw error;

        const { data } = db.storage
            .from("product-photos")
            .getPublicUrl(filename);

        return data.publicUrl;
    }

    // SAVE PRODUCT WITH ITS PHOTO
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const name = document.getElementById("productName").value.trim();
        const description =
            document.getElementById("productDescription").value.trim();
        const costPrice =
            Number(document.getElementById("productCostPrice").value);
        const price =
            Number(document.getElementById("productPrice").value);
        const stock =
            Number(document.getElementById("productStock").value);

        if (!name || !Number.isFinite(costPrice) ||
            !Number.isFinite(price) || costPrice <= 0 ||
            price <= 0 || stock < 0 || !Number.isInteger(stock)) {
            message.textContent = "Please enter valid product details.";
            return;
        }

        const file = photoInput.files[0];

        if (file && (
            !["image/jpeg", "image/png", "image/webp"].includes(file.type) ||
            file.size > 5 * 1024 * 1024
        )) {
            message.textContent = "Choose a valid photo of 5 MB or less.";
            return;
        }

        submitButton.disabled = true;

        try {
            let imageUrl = null;

            if (file) {
                message.textContent = "Uploading photo...";
                imageUrl = await uploadPhoto(file);
            }

            message.textContent = "Saving product...";

            const { error } = await db.from("products").insert([{
                name,
                description,
                cost_price: costPrice,
                price,
                stock,
                image_url: imageUrl
            }]);

            if (error) throw error;

            message.textContent = "Product and photo saved successfully!";

            form.reset();
            preview.removeAttribute("src");
            preview.style.display = "none";

            window.location.reload();

        } catch (error) {
            message.textContent = "Could not save product: " + error.message;
        } finally {
            submitButton.disabled = false;
        }
    }, true);
});
