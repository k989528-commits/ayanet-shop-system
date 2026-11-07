document.addEventListener("DOMContentLoaded", function () {
    const db = window.supabase.createClient(
        "https://jltadhukraspfdaxbvwo.supabase.co",
        "sb_publishable_tItrrAg_q9xSCskecgc5Jg_bJkxsOiu"
    );

    const bucket = "product-photos";
    const form = document.getElementById("productForm");
    const message = document.getElementById("productMessage");
    const productsSection = document.getElementById("productsSection");

    if (!form || !message || !productsSection) return;

    // PRODUCT PHOTO INPUT
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

    function validPhoto(file) {
        return file &&
            ["image/jpeg", "image/png", "image/webp"].includes(file.type) &&
            file.size <= 5 * 1024 * 1024;
    }

    photoInput.addEventListener("change", function () {
        const file = photoInput.files[0];
        if (!file) return;

        if (!validPhoto(file)) {
            alert("Choose a JPG, PNG or WEBP photo of 5 MB or less.");
            photoInput.value = "";
            preview.style.display = "none";
            return;
        }

        preview.src = URL.createObjectURL(file);
        preview.style.display = "block";
    });

    function extensionFor(file) {
        return file.type === "image/png" ? "png" :
            file.type === "image/webp" ? "webp" : "jpg";
    }

    function storagePath(url) {
        if (!url) return null;

        const marker = "/storage/v1/object/public/" + bucket + "/";
        const position = url.indexOf(marker);

        if (position === -1) return null;

        return decodeURIComponent(url.substring(position + marker.length));
    }

    async function uploadPhoto(file, productId) {
        const filename =
            productId + "-" + Date.now() + "." + extensionFor(file);

        const { error } = await db.storage
            .from(bucket)
            .upload(filename, file, {
                contentType: file.type,
                upsert: false
            });

        if (error) throw error;

        return {
            filename,
            url: db.storage.from(bucket).getPublicUrl(filename).data.publicUrl
        };
    }

    // ADD PRODUCT WITH OPTIONAL PHOTO
    form.addEventListener("submit", async function (event) {
        event.preventDefault();
        event.stopImmediatePropagation();

        const file = photoInput.files[0];

        if (file && !validPhoto(file)) {
            message.textContent = "Choose a valid photo of 5 MB or less.";
            return;
        }

        button.disabled = true;

        try {
            let imageUrl = null;

            const product = {
                name: document.getElementById("productName").value.trim(),
                description: document.getElementById("productDescription").value.trim(),
                cost_price: Number(document.getElementById("productCostPrice").value),
                price: Number(document.getElementById("productPrice").value),
                stock: Number(document.getElementById("productStock").value),
                image_url: null
            };

            if (file) {
                message.textContent = "Uploading photo...";
                const uploaded = await uploadPhoto(file, "new");
                imageUrl = uploaded.url;
            }

            product.image_url = imageUrl;

            message.textContent = "Saving product...";

            const { error } = await db.from("products").insert([product]);

            if (error) throw error;

            alert("Product saved successfully!");
            window.location.reload();

        } catch (error) {
            message.textContent = "Error: " + error.message;
        } finally {
            button.disabled = false;
        }
    }, true);

    // PRODUCT PHOTO MANAGEMENT AREA
    const manager = document.createElement("section");
    manager.style.marginTop = "25px";
    manager.innerHTML = `
        <h3>Product Photo Management</h3>
        <p>View, replace or delete product photos without deleting products.</p>
        <button type="button" id="loadProductPhotos">Load Product Photos</button>
        <div id="productPhotoList"></div>
    `;

    productsSection.appendChild(manager);

    const loadButton = manager.querySelector("#loadProductPhotos");
    const photoList = manager.querySelector("#productPhotoList");

    async function loadProductPhotos() {
        loadButton.disabled = true;
        photoList.textContent = "Loading products...";

        try {
            const { data, error } = await db
                .from("products")
                .select("id,name,image_url")
                .order("name");

            if (error) throw error;

            photoList.innerHTML = "";

            if (!data || data.length === 0) {
                photoList.textContent = "No products found.";
                return;
            }

            data.forEach(function (product) {
                const card = document.createElement("div");
                card.style.border = "1px solid #ccc";
                card.style.padding = "12px";
                card.style.margin = "12px 0";

                const heading = document.createElement("h4");
                heading.textContent = product.name;
                card.appendChild(heading);

                if (product.image_url) {
                    const image = document.createElement("img");
                    image.src = product.image_url;
                    image.alt = product.name;
                    image.style.maxWidth = "140px";
                    image.style.display = "block";
                    image.style.marginBottom = "10px";
                    card.appendChild(image);
                } else {
                    const noPhoto = document.createElement("p");
                    noPhoto.textContent = "No photo uploaded.";
                    card.appendChild(noPhoto);
                }

                const fileInput = document.createElement("input");
                fileInput.type = "file";
                fileInput.accept = "image/jpeg,image/png,image/webp";
                card.appendChild(fileInput);

                const replaceButton = document.createElement("button");
                replaceButton.type = "button";
                replaceButton.textContent = "Replace Photo";

                replaceButton.addEventListener("click", async function () {
                    const file = fileInput.files[0];

                    if (!file) {
                        alert("Choose a photo first.");
                        return;
                    }

                    if (!validPhoto(file)) {
                        alert("Choose JPG, PNG or WEBP up to 5 MB.");
                        return;
                    }

                    replaceButton.disabled = true;

                    try {
                        const uploaded = await uploadPhoto(file, product.id);

                        const { error } = await db
                            .from("products")
                            .update({ image_url: uploaded.url })
                            .eq("id", product.id);

                        if (error) {
                            await db.storage.from(bucket).remove([uploaded.filename]);
                            throw error;
                        }

                        const oldPath = storagePath(product.image_url);

                        if (oldPath) {
                            await db.storage.from(bucket).remove([oldPath]);
                        }

                        alert("Product photo replaced successfully!");
                        await loadProductPhotos();

                    } catch (error) {
                        alert("Could not replace photo: " + error.message);
                    } finally {
                        replaceButton.disabled = false;
                    }
                });

                card.appendChild(replaceButton);

                if (product.image_url) {
                    const deleteButton = document.createElement("button");
                    deleteButton.type = "button";
                    deleteButton.textContent = "Delete Photo";
                    deleteButton.style.marginLeft = "8px";

                    deleteButton.addEventListener("click", async function () {
                        if (!confirm("Delete the photo for " + product.name + "? The product will remain.")) {
                            return;
                        }

                        deleteButton.disabled = true;

                        try {
                            const { error } = await db
                                .from("products")
                                .update({ image_url: null })
                                .eq("id", product.id);

                            if (error) throw error;

                            const oldPath = storagePath(product.image_url);

                            if (oldPath) {
                                const { error: storageError } = await db
                                    .storage.from(bucket).remove([oldPath]);

                                if (storageError) {
                                    alert("Photo removed from product, but storage cleanup failed: " + storageError.message);
                                }
                            }

                            alert("Photo deleted. The product is still saved.");
                            await loadProductPhotos();

                        } catch (error) {
                            alert("Could not delete photo: " + error.message);
                        } finally {
                            deleteButton.disabled = false;
                        }
                    });

                    card.appendChild(deleteButton);
                }

                photoList.appendChild(card);
            });

        } catch (error) {
            photoList.textContent = "Error loading photos: " + error.message;
        } finally {
            loadButton.disabled = false;
        }
    }

    loadButton.addEventListener("click", loadProductPhotos);
});
