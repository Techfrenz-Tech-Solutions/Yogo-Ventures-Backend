const { Validator } = require("node-input-validator");
const path = require('path');
const fs = require('fs');
const crypto = require('crypto');
const db = require('../models/db.js');
const { storageDir } = require('../helper/upload.js');
const quoteEmailService = require('../services/quoteEmailService.js');

// Best-effort delete of a previously-uploaded image by filename (as stored
// in the DB) — used when an update replaces an image or a record carrying
// images is deleted. Never throws; a missing/already-gone file is not an error.
function deleteStorageFile(filename) {
    if (!filename) return;
    fs.unlink(path.join(storageDir, filename), (err) => {
        if (err && err.code !== 'ENOENT') {
            console.error('Failed to remove old image:', filename, err.message);
        }
    });
}

// Best-effort record of an admin action into activity_log — used only for
// actions that can't be reconstructed from other tables afterward (e.g.
// deletions, where the row itself is gone). Never throws / never blocks the
// caller's response; a failed log write shouldn't fail the underlying action.
function logActivity(actionType, description, referenceId) {
    db.mainDb(
        `INSERT INTO activity_log (action_type, description, reference_id) VALUES (?, ?, ?)`,
        [actionType, description, referenceId != null ? String(referenceId) : null],
        (err) => {
            if (err) console.error('Failed to write activity_log entry:', actionType, err.message);
        }
    );
}

// Create Enquiry
exports.createCountry = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        country_code: 'required|string|maxLength:10',
        country_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");
            return res.json({ status: 0, message: error_message });
        }

        const insertQuery = `
            INSERT INTO country_master
            (country_code, country_name)
            VALUES (?, ?)`;

        db.mainDb(
            insertQuery,
            [reqData.country_code, reqData.country_name],
            (err, result) => {
                if (err) {
                    return res.json({ status: 0, message: "DB error" });
                }

                return res.json({
                    status: 1,
                    message: "Country created successfully",
                    id: result.insertId
                });
            }
        );
    });
};


exports.getCountries = (req, res) => {
    db.mainDb(
        `SELECT * FROM country_master ORDER BY id DESC`,
        [],
        (err, result) => {
            if (err) {
                return res.json({ status: 0, message: "DB error" });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getCountry = (req, res) => {
    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM country_master WHERE id = ?`,
        [id],
        (err, result) => {
            if (err) {
                return res.json({ status: 0, message: "DB error" });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Country not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateCountry = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        country_code: 'required|string|maxLength:10',
        country_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const updateQuery = `
            UPDATE country_master
            SET country_code = ?, country_name = ?
            WHERE id = ?`;

        db.mainDb(
            updateQuery,
            [
                reqData.country_code,
                reqData.country_name,
                reqData.id
            ],
            (err, result) => {
                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Country not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Country updated successfully"
                });
            }
        );
    });
};

exports.deleteCountry = (req, res) => {
    const id = req.body.id;

    db.mainDb(
        `DELETE FROM country_master WHERE id = ?`,
        [id],
        (err, result) => {
            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Country not found"
                });
            }

            return res.json({
                status: 1,
                message: "Country deleted successfully"
            });
        }
    );
};
//----------------------------------------------------
exports.createCategory = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        category_code: 'required|string|maxLength:20',
        category_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");
            return res.json({ status: 0, message: error_message });
        }

        const insertQuery = `
            INSERT INTO category_master
            (category_code, category_name)
            VALUES (?, ?)`;

        db.mainDb(
            insertQuery,
            [reqData.category_code, reqData.category_name],
            (err, result) => {
                if (err) {
                    return res.json({ status: 0, message: "DB error" });
                }

                return res.json({
                    status: 1,
                    message: "Category created successfully",
                    id: result.insertId
                });
            }
        );
    });
};


exports.getCategories = (req, res) => {
    db.mainDb(
        `SELECT * FROM category_master ORDER BY id DESC`,
        [],
        (err, result) => {
            if (err) {
                return res.json({ status: 0, message: "DB error" });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getCategory = (req, res) => {
    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM category_master WHERE id = ?`,
        [id],
        (err, result) => {
            if (err) {
                return res.json({ status: 0, message: "DB error" });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Category not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateCategory = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        category_code: 'required|string|maxLength:20',
        category_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const updateQuery = `
            UPDATE category_master
            SET category_code = ?, category_name = ?
            WHERE id = ?`;

        db.mainDb(
            updateQuery,
            [
                reqData.category_code,
                reqData.category_name,
                reqData.id
            ],
            (err, result) => {
                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Category not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Category updated successfully"
                });
            }
        );
    });
};



exports.deleteCategory = (req, res) => {
    const id = req.body.id;

    db.mainDb(
        `DELETE FROM category_master WHERE id = ?`,
        [id],
        (err, result) => {
            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Category not found"
                });
            }

            return res.json({
                status: 1,
                message: "Category deleted successfully"
            });
        }
    );
};



exports.categoryDropdown = (req, res) => {

    const query = `
        SELECT
            id,
            category_name
        FROM category_master
        ORDER BY id ASC
    `;

    db.mainDb(query, [], (err, result) => {
        if (err) {
            return res.json({
                status: 0,
                message: "DB error"
            });
        }

        return res.json({
            status: 1,
            data: result
        });
    });
};


// Country Dropdown (public — used by the website's contact form)
exports.countryDropdown = (req, res) => {

    const query = `
        SELECT
            id,
            country_name
        FROM country_master
        ORDER BY id ASC
    `;

    db.mainDb(query, [], (err, result) => {
        if (err) {
            return res.json({
                status: 0,
                message: "DB error"
            });
        }

        return res.json({
            status: 1,
            data: result
        });
    });
};

//-----------------------------------------------------------------------------

// Create Sub Category
exports.createSubCategory = (req, res) => {
    const reqData = req.body;

    const v = new Validator(reqData, {
        sub_category_code: 'required|string|maxLength:20',
        sub_category_name: 'required|string|maxLength:100',
        category_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {
        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            INSERT INTO sub_category_master
            (
                sub_category_code,
                sub_category_name,
                category_name
            )
            VALUES (?, ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.sub_category_code,
                reqData.sub_category_name,
                reqData.category_name
            ],
            (err, result) => {
                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Sub Category created successfully",
                    id: result.insertId
                });
            }
        );
    });
};


// List Sub Categories
exports.getSubCategories = (req, res) => {

    db.mainDb(
        `SELECT * FROM sub_category_master ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


// Get Single Sub Category
exports.getSubCategory = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM sub_category_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Sub Category not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


// Update Sub Category
exports.updateSubCategory = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        sub_category_code: 'required|string|maxLength:20',
        sub_category_name: 'required|string|maxLength:100',
        category_name: 'required|string|maxLength:100'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE sub_category_master
            SET
                sub_category_code = ?,
                sub_category_name = ?,
                category_name = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.sub_category_code,
                reqData.sub_category_name,
                reqData.category_name,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Sub Category not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Sub Category updated successfully"
                });
            }
        );
    });
};


// Delete Sub Category
exports.deleteSubCategory = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM sub_category_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Sub Category not found"
                });
            }

            return res.json({
                status: 1,
                message: "Sub Category deleted successfully"
            });
        }
    );
};


// Sub Category Dropdown
exports.subCategoryDropdown = (req, res) => {

    db.mainDb(
        `SELECT
            id AS value,
            sub_category_name AS label
         FROM sub_category_master
         ORDER BY sub_category_name`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};
//---------------------------------------------------------------------------

exports.createProduct = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        product_code: 'required|string|maxLength:50',
        product_name: 'required|string|maxLength:255',
        category_name: 'required|string|maxLength:100',
        sub_category_name: 'required|string|maxLength:100',
        product_description: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const files = req.files || {};

        const query = `
            INSERT INTO product_master
            (
                product_code,
                product_name,
                category_name,
                sub_category_name,
                product_description,
                index_image,
                image1,
                image2,
                image3,
                image4,
                image5
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.product_code,
                reqData.product_name,
                reqData.category_name,
                reqData.sub_category_name,
                reqData.product_description,
                files.index_image?.[0]?.filename || '',
                files.image1?.[0]?.filename || '',
                files.image2?.[0]?.filename || '',
                files.image3?.[0]?.filename || '',
                files.image4?.[0]?.filename || '',
                files.image5?.[0]?.filename || ''
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Product created successfully",
                    id: result.insertId
                });
            }
        );
    });
};



exports.getProducts = (req, res) => {

    db.mainDb(
        `SELECT * FROM product_master ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getProduct = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM product_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Product not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateProduct = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        product_code: 'required|string|maxLength:50',
        product_name: 'required|string|maxLength:255',
        category_name: 'required|string|maxLength:100',
        sub_category_name: 'required|string|maxLength:100',
        product_description: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const files = req.files || {};
        const imageFields = ['index_image', 'image1', 'image2', 'image3', 'image4', 'image5'];

        const runUpdate = (images, filesToDelete) => {
            const query = `
                UPDATE product_master
                SET
                    product_code = ?,
                    product_name = ?,
                    category_name = ?,
                    sub_category_name = ?,
                    product_description = ?,
                    index_image = ?,
                    image1 = ?,
                    image2 = ?,
                    image3 = ?,
                    image4 = ?,
                    image5 = ?
                WHERE id = ?
            `;

            db.mainDb(
                query,
                [
                    reqData.product_code,
                    reqData.product_name,
                    reqData.category_name,
                    reqData.sub_category_name,
                    reqData.product_description,
                    images.index_image,
                    images.image1,
                    images.image2,
                    images.image3,
                    images.image4,
                    images.image5,
                    reqData.id
                ],
                (err, result) => {

                    if (err) {
                        return res.json({
                            status: 0,
                            message: "DB error"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({
                            status: 0,
                            message: "Product not found"
                        });
                    }

                    // Only remove replaced images once the DB write has
                    // actually succeeded, so a failed update never leaves a
                    // product referencing a file that no longer exists.
                    filesToDelete.forEach(deleteStorageFile);

                    return res.json({
                        status: 1,
                        message: "Product updated successfully"
                    });
                }
            );
        };

        // Always look up the existing row first — this is what tells us
        // which on-disk files, if any, get replaced and should be cleaned up.
        db.mainDb(
            `SELECT index_image, image1, image2, image3, image4, image5 FROM product_master WHERE id = ?`,
            [reqData.id],
            (err, existingRows) => {
                if (err || existingRows.length === 0) {
                    return res.json({ status: 0, message: "Product not found" });
                }

                const existing = existingRows[0];
                const images = {};
                const filesToDelete = [];
                imageFields.forEach((field) => {
                    const newFilename = files[field]?.[0]?.filename;
                    if (newFilename) {
                        images[field] = newFilename;
                        if (existing[field] && existing[field] !== newFilename) {
                            filesToDelete.push(existing[field]);
                        }
                    } else {
                        images[field] = existing[field] || '';
                    }
                });
                runUpdate(images, filesToDelete);
            }
        );
    });
};

exports.deleteProduct = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `SELECT product_code, product_name, index_image, image1, image2, image3, image4, image5 FROM product_master WHERE id = ?`,
        [id],
        (selectErr, existingRows) => {
            if (selectErr) {
                return res.json({ status: 0, message: "DB error" });
            }

            db.mainDb(
                `DELETE FROM product_master WHERE id = ?`,
                [id],
                (err, result) => {

                    if (err) {
                        return res.json({
                            status: 0,
                            message: "DB error"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({
                            status: 0,
                            message: "Product not found"
                        });
                    }

                    if (existingRows.length > 0) {
                        ['index_image', 'image1', 'image2', 'image3', 'image4', 'image5']
                            .forEach((field) => deleteStorageFile(existingRows[0][field]));

                        logActivity(
                            'product_deleted',
                            `Product deleted — ${existingRows[0].product_name}`,
                            existingRows[0].product_code
                        );
                    }

                    return res.json({
                        status: 1,
                        message: "Product deleted successfully"
                    });
                }
            );
        }
    );
};

//------------------------------------------------------------------------------

// Generates a customer-facing reference like "YQ-20260711-8SNKBTVF" (or
// "CR-..." for contact enquiries). Uses crypto.randomBytes (not Math.random)
// so it can't be guessed/enumerated.
function generateReferenceNumber(prefix = 'YQ') {
    const datePart = new Date().toISOString().slice(0, 10).replace(/-/g, '');
    const randomPart = crypto.randomBytes(6).toString('hex').toUpperCase().slice(0, 8);
    return `${prefix}-${datePart}-${randomPart}`;
}

const PUBLIC_ASSET_BASE_URL = (process.env.PUBLIC_ASSET_BASE_URL || '').replace(/\/+$/, '');
function buildStorageUrl(filename) {
    if (!filename || !PUBLIC_ASSET_BASE_URL) return '';
    return `${PUBLIC_ASSET_BASE_URL}/storage/${filename}`;
}

// Re-fetches product name/image from product_master by id rather than
// trusting whatever the browser sent — quantity/color/variant are free-text
// enquiry details (low risk, not re-derivable from a product row) and are
// kept as submitted, but clamped/sanitised.
async function resolveCartItems(itemsRaw) {
    if (!Array.isArray(itemsRaw) || itemsRaw.length === 0) return [];

    const productIds = [...new Set(
        itemsRaw
            .map((i) => parseInt(i.product_id, 10))
            .filter((id) => Number.isInteger(id) && id > 0)
    )];

    let productsById = {};
    if (productIds.length > 0) {
        const placeholders = productIds.map(() => '?').join(',');
        const rows = await db.mainDbForCron(
            `SELECT id, product_name, index_image FROM product_master WHERE id IN (${placeholders})`,
            productIds
        );
        productsById = Object.fromEntries(rows.map((r) => [r.id, r]));
    }

    return itemsRaw.slice(0, 100).map((raw) => {
        const productId = parseInt(raw.product_id, 10);
        const product = Number.isInteger(productId) ? productsById[productId] : undefined;

        const quantity = Math.min(Math.max(parseInt(raw.quantity ?? raw.qty ?? 1, 10) || 1, 1), 9999);
        const name = (product?.product_name || String(raw.product_name || 'Item')).slice(0, 255);
        const variant = raw.variant ? String(raw.variant).slice(0, 100) : '';
        const color = raw.color ? String(raw.color).slice(0, 100) : '';
        const image = product?.index_image ? buildStorageUrl(product.index_image) : '';

        return {
            product_id: Number.isInteger(productId) ? productId : null,
            product_name: name,
            quantity,
            variant,
            color,
            image,
        };
    });
}

exports.createEnquiryQuote = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        product_name: 'required|string|maxLength:255',
        qty: 'required|integer',
        color: 'required|string|maxLength:100',
        first_name: 'required|string|maxLength:100',
        last_name: 'required|string|maxLength:100',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20',
        message: 'required|string'
    });

    v.check().then(async (matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        let items;
        try {
            items = await resolveCartItems(reqData.items);
        } catch (err) {
            console.error('Failed to resolve cart items for quote enquiry:', err.message);
            items = [];
        }

        const referenceNumber = generateReferenceNumber();
        const itemsJson = JSON.stringify(items);

        const query = `
            INSERT INTO get_enquire_quote
            (
                product_name,
                qty,
                color,
                first_name,
                last_name,
                email_id,
                country,
                phone_number,
                message,
                status,
                reference_number,
                items_json
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 'Pending', ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.product_name,
                reqData.qty,
                reqData.color,
                reqData.first_name,
                reqData.last_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number,
                reqData.message,
                referenceNumber,
                itemsJson
            ],
            async (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                const quoteId = result.insertId;
                let emailResult = { sent: false, status: 'failed' };
                try {
                    emailResult = await quoteEmailService.sendQuoteConfirmation({
                        id: quoteId,
                        first_name: reqData.first_name,
                        last_name: reqData.last_name,
                        email_id: reqData.email_id,
                        phone_number: reqData.phone_number,
                        country: reqData.country,
                        message: reqData.message,
                        reference_number: referenceNumber,
                        created_date: new Date(),
                        items,
                    });
                } catch (emailErr) {
                    // The quote is already committed — a mailer-level failure here
                    // must never roll back or invalidate it.
                    console.error(`Unexpected error sending confirmation email for quote #${quoteId}:`, emailErr.message);
                }

                return res.json({
                    status: 1,
                    message: "Enquiry Quote submitted successfully",
                    id: quoteId,
                    quote_reference: referenceNumber,
                    email: emailResult
                });
            }
        );
    });
};


exports.getEnquiryQuotes = (req, res) => {

    db.mainDb(
        `SELECT * FROM get_enquire_quote ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};



exports.getEnquiryQuote = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM get_enquire_quote WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Enquiry Quote not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateEnquiryQuoteStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        status: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE get_enquire_quote
            SET status = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.status,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Enquiry Quote not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Status updated successfully"
                });
            }
        );
    });
};


exports.deleteEnquiryQuote = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM get_enquire_quote WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Enquiry Quote not found"
                });
            }

            return res.json({
                status: 1,
                message: "Enquiry Quote deleted successfully"
            });
        }
    );
};

//------------------------------------------------------------------------------

exports.createContactUs = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        first_name: 'required|string|maxLength:100',
        last_name: 'required|string|maxLength:100',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20',
        subject: 'required|string|maxLength:255',
        message: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const referenceNumber = generateReferenceNumber('CR');

        const query = `
            INSERT INTO contact_us_enquiry
            (
                first_name,
                last_name,
                email_id,
                country,
                phone_number,
                subject,
                message,
                status,
                reference_number
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        `;

        db.mainDb(
            query,
            [
                reqData.first_name,
                reqData.last_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number,
                reqData.subject,
                reqData.message,
                referenceNumber
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Contact enquiry submitted successfully",
                    id: result.insertId,
                    contact_reference: referenceNumber
                });
            }
        );
    });
};


exports.getContactUsList = (req, res) => {

    db.mainDb(
        `SELECT * FROM contact_us_enquiry ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};



exports.getContactUs = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM contact_us_enquiry WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Contact enquiry not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


exports.updateContactUsStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        status: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE contact_us_enquiry
            SET status = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.status,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Contact enquiry not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Status updated successfully"
                });
            }
        );
    });
};


exports.deleteContactUs = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM contact_us_enquiry WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Contact enquiry not found"
                });
            }

            return res.json({
                status: 1,
                message: "Contact enquiry deleted successfully"
            });
        }
    );
};

//-----------------------------------------------------------------------------

// Create Best Selling
exports.createBestSelling = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        product_name: 'required|string|maxLength:255'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const image = req.file ? req.file.filename : '';

        const query = `
            INSERT INTO best_selling
            (
                product_name,
                image
            )
            VALUES (?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.product_name,
                image
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Best Selling created successfully",
                    id: result.insertId
                });
            }
        );
    });
};


// Get Best Selling List
exports.getBestSellingList = (req, res) => {

    db.mainDb(
        `SELECT * FROM best_selling ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


// Get Single Best Selling
exports.getBestSelling = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM best_selling WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Best Selling not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


// Update Best Selling
exports.updateBestSelling = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        product_name: 'required|string|maxLength:255'
    });

    v.check().then((matched) => {

        if (!matched) {

            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const runUpdate = (image, oldImageToDelete) => {
            const query = `
                UPDATE best_selling
                SET
                    product_name = ?,
                    image = ?
                WHERE id = ?
            `;

            db.mainDb(
                query,
                [
                    reqData.product_name,
                    image,
                    reqData.id
                ],
                (err, result) => {

                    if (err) {
                        return res.json({
                            status: 0,
                            message: "DB error"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({
                            status: 0,
                            message: "Best Selling not found"
                        });
                    }

                    if (oldImageToDelete) deleteStorageFile(oldImageToDelete);

                    return res.json({
                        status: 1,
                        message: "Best Selling updated successfully"
                    });
                }
            );
        };

        db.mainDb(
            `SELECT image FROM best_selling WHERE id = ?`,
            [reqData.id],
            (err, existing) => {
                if (err || existing.length === 0) {
                    return res.json({ status: 0, message: "Best Selling not found" });
                }
                if (req.file) {
                    const oldImage = existing[0].image;
                    runUpdate(req.file.filename, oldImage && oldImage !== req.file.filename ? oldImage : null);
                } else {
                    runUpdate(existing[0].image, null);
                }
            }
        );
    });
};


// Delete Best Selling
exports.deleteBestSelling = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `SELECT image FROM best_selling WHERE id = ?`,
        [id],
        (selectErr, existingRows) => {
            if (selectErr) {
                return res.json({ status: 0, message: "DB error" });
            }

    db.mainDb(
        `DELETE FROM best_selling WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Best Selling not found"
                });
            }

            if (existingRows.length > 0) deleteStorageFile(existingRows[0].image);

            return res.json({
                status: 1,
                message: "Best Selling deleted successfully"
            });
        }
    );
        }
    );
};
//----------------------------------------------------------------------

exports.createNewArrival = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        product_name: 'required|string|maxLength:255'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const image = req.file ? req.file.filename : '';

        const query = `
            INSERT INTO new_arrivals
            (
                product_name,
                image
            )
            VALUES (?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.product_name,
                image
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "New Arrival created successfully",
                    id: result.insertId
                });
            }
        );
    });
};

exports.getNewArrivalList = (req, res) => {

    db.mainDb(
        `SELECT * FROM new_arrivals ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getNewArrival = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM new_arrivals WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "New Arrival not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};

exports.updateNewArrival = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        product_name: 'required|string|maxLength:255'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const runUpdate = (image, oldImageToDelete) => {
            const query = `
                UPDATE new_arrivals
                SET
                    product_name = ?,
                    image = ?
                WHERE id = ?
            `;

            db.mainDb(
                query,
                [
                    reqData.product_name,
                    image,
                    reqData.id
                ],
                (err, result) => {

                    if (err) {
                        return res.json({
                            status: 0,
                            message: "DB error"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({
                            status: 0,
                            message: "New Arrival not found"
                        });
                    }

                    if (oldImageToDelete) deleteStorageFile(oldImageToDelete);

                    return res.json({
                        status: 1,
                        message: "New Arrival updated successfully"
                    });
                }
            );
        };

        db.mainDb(
            `SELECT image FROM new_arrivals WHERE id = ?`,
            [reqData.id],
            (err, existing) => {
                if (err || existing.length === 0) {
                    return res.json({ status: 0, message: "New Arrival not found" });
                }
                if (req.file) {
                    const oldImage = existing[0].image;
                    runUpdate(req.file.filename, oldImage && oldImage !== req.file.filename ? oldImage : null);
                } else {
                    runUpdate(existing[0].image, null);
                }
            }
        );
    });
};


exports.deleteNewArrival = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `SELECT image FROM new_arrivals WHERE id = ?`,
        [id],
        (selectErr, existingRows) => {
            if (selectErr) {
                return res.json({ status: 0, message: "DB error" });
            }

    db.mainDb(
        `DELETE FROM new_arrivals WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "New Arrival not found"
                });
            }

            if (existingRows.length > 0) deleteStorageFile(existingRows[0].image);

            return res.json({
                status: 1,
                message: "New Arrival deleted successfully"
            });
        }
    );
        }
    );
};

//-----------------------------------------------------------------------------

exports.createEnquiry = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        first_name: 'required|string|maxLength:100',
        last_name: 'required|string|maxLength:100',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20',
        product_category: 'required|string|maxLength:255',
        message: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const referenceNumber = generateReferenceNumber('ENQ');

        const query = `
            INSERT INTO enquiries
            (
                first_name,
                last_name,
                email_id,
                country,
                phone_number,
                product_category,
                message,
                status,
                reference_number
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, 'Pending', ?)
        `;

        db.mainDb(
            query,
            [
                reqData.first_name,
                reqData.last_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number,
                reqData.product_category,
                reqData.message,
                referenceNumber
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Enquiry submitted successfully",
                    id: result.insertId,
                    enquiry_reference: referenceNumber
                });
            }
        );
    });
};


exports.getEnquiries = (req, res) => {

    db.mainDb(
        `SELECT * FROM enquiries ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getEnquiry = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM enquiries WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Enquiry not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


exports.updateEnquiryStatus = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        status: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE enquiries
            SET status = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.status,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Enquiry not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Status updated successfully"
                });
            }
        );
    });
};


exports.deleteEnquiry = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM enquiries WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Enquiry not found"
                });
            }

            return res.json({
                status: 1,
                message: "Enquiry deleted successfully"
            });
        }
    );
};
//---------------------------------------------------------------------------

exports.createCustomer = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        customer_name: 'required|string|maxLength:255',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            INSERT INTO customer_master
            (
                customer_name,
                email_id,
                country,
                phone_number
            )
            VALUES (?, ?, ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.customer_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Customer created successfully",
                    id: result.insertId
                });
            }
        );
    });
};

exports.getCustomers = (req, res) => {

    db.mainDb(
        `SELECT * FROM customer_master ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};


exports.getCustomer = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM customer_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Customer not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};



exports.updateCustomer = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        customer_name: 'required|string|maxLength:255',
        email_id: 'required|email',
        country: 'required|string|maxLength:100',
        phone_number: 'required|string|maxLength:20'
    });

    v.check().then((matched) => {

        if (!matched) {

            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE customer_master
            SET
                customer_name = ?,
                email_id = ?,
                country = ?,
                phone_number = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.customer_name,
                reqData.email_id,
                reqData.country,
                reqData.phone_number,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Customer not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Customer updated successfully"
                });
            }
        );
    });
};


exports.deleteCustomer = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `DELETE FROM customer_master WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.affectedRows === 0) {
                return res.json({
                    status: 0,
                    message: "Customer not found"
                });
            }

            return res.json({
                status: 1,
                message: "Customer deleted successfully"
            });
        }
    );
};

//-----------------------------------------------------------------------------
exports.createOrderTracking = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        order_id: 'required|string|maxLength:100',
        customer_id: 'required|integer',
        product_name: 'required|string|maxLength:255',
        quantity: 'required|integer'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            INSERT INTO order_tracking (
                order_id,
                customer_id,
                product_name,
                quantity,
                order_placed_date,
                product_initiated_date,
                inspection_initiated_date,
                certification_in_progress_date,
                packing_in_progress_date,
                shipped_from_manufacturer_date,
                in_yogo_warehouse_date,
                shipped_from_yogo_date,
                customer_clearance_date,
                bill_of_loading_date,
                sold_on_date,
                reached_destination_date,
                customer_clearance_destination_date,
                reached_customer_warehouse_date,
                order_complete_date
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.order_id,
                reqData.customer_id,
                reqData.product_name,
                reqData.quantity,
                reqData.order_placed_date || null,
                reqData.product_initiated_date || null,
                reqData.inspection_initiated_date || null,
                reqData.certification_in_progress_date || null,
                reqData.packing_in_progress_date || null,
                reqData.shipped_from_manufacturer_date || null,
                reqData.in_yogo_warehouse_date || null,
                reqData.shipped_from_yogo_date || null,
                reqData.customer_clearance_date || null,
                reqData.bill_of_loading_date || null,
                reqData.sold_on_date || null,
                reqData.reached_destination_date || null,
                reqData.customer_clearance_destination_date || null,
                reqData.reached_customer_warehouse_date || null,
                reqData.order_complete_date || null
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Order Tracking created successfully",
                    id: result.insertId
                });
            }
        );
    });
};

exports.getOrderTrackingList = (req, res) => {

    db.mainDb(
        `SELECT * FROM order_tracking ORDER BY id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );
};

exports.getOrderTracking = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM order_tracking WHERE id = ?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length === 0) {
                return res.json({
                    status: 0,
                    message: "Order Tracking not found"
                });
            }

            return res.json({
                status: 1,
                data: result[0]
            });
        }
    );
};


exports.updateOrderTracking = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        id: 'required|integer',
        order_id: 'required|string|maxLength:100',
        customer_id: 'required|integer',
        product_name: 'required|string|maxLength:255',
        quantity: 'required|integer'
    });

    v.check().then((matched) => {

        if (!matched) {
            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });
        }

        const query = `
            UPDATE order_tracking SET
                order_id = ?,
                customer_id = ?,
                product_name = ?,
                quantity = ?,
                order_placed_date = ?,
                product_initiated_date = ?,
                inspection_initiated_date = ?,
                certification_in_progress_date = ?,
                packing_in_progress_date = ?,
                shipped_from_manufacturer_date = ?,
                in_yogo_warehouse_date = ?,
                shipped_from_yogo_date = ?,
                customer_clearance_date = ?,
                bill_of_loading_date = ?,
                sold_on_date = ?,
                reached_destination_date = ?,
                customer_clearance_destination_date = ?,
                reached_customer_warehouse_date = ?,
                order_complete_date = ?
            WHERE id = ?
        `;

        db.mainDb(
            query,
            [
                reqData.order_id,
                reqData.customer_id,
                reqData.product_name,
                reqData.quantity,
                reqData.order_placed_date || null,
                reqData.product_initiated_date || null,
                reqData.inspection_initiated_date || null,
                reqData.certification_in_progress_date || null,
                reqData.packing_in_progress_date || null,
                reqData.shipped_from_manufacturer_date || null,
                reqData.in_yogo_warehouse_date || null,
                reqData.shipped_from_yogo_date || null,
                reqData.customer_clearance_date || null,
                reqData.bill_of_loading_date || null,
                reqData.sold_on_date || null,
                reqData.reached_destination_date || null,
                reqData.customer_clearance_destination_date || null,
                reqData.reached_customer_warehouse_date || null,
                reqData.order_complete_date || null,
                reqData.id
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                if (result.affectedRows === 0) {
                    return res.json({
                        status: 0,
                        message: "Order Tracking not found"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Order Tracking updated successfully"
                });
            }
        );
    });
};

exports.deleteOrderTracking = (req, res) => {

    const id = req.body.id;

    db.mainDb(
        `SELECT order_id, product_name FROM order_tracking WHERE id = ?`,
        [id],
        (selectErr, existingRows) => {
            if (selectErr) {
                return res.json({ status: 0, message: "DB error" });
            }

            db.mainDb(
                `DELETE FROM order_tracking WHERE id = ?`,
                [id],
                (err, result) => {

                    if (err) {
                        return res.json({
                            status: 0,
                            message: "DB error"
                        });
                    }

                    if (result.affectedRows === 0) {
                        return res.json({
                            status: 0,
                            message: "Order Tracking not found"
                        });
                    }

                    if (existingRows.length > 0) {
                        logActivity(
                            'order_deleted',
                            `Order deleted — ${existingRows[0].product_name}`,
                            existingRows[0].order_id
                        );
                    }

                    return res.json({
                        status: 1,
                        message: "Order Tracking deleted successfully"
                    });
                }
            );
        }
    );
};

//-------------------------------------------------------------------


exports.createSampleEnquiry = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        enquiry_id: 'required|integer',
        customer_id: 'required|integer',
        enquired_on: 'required|date',
        product_name: 'required|string|maxLength:255',
        quantity: 'required|integer',
        responded: 'required|string',
        sample_ordered: 'required|string',
        sample_shipped: 'required|string',
        order_placed: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {

            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });

        }

        const query = `
            INSERT INTO sample_enquiry
            (
                enquiry_id,
                customer_id,
                enquired_on,
                product_name,
                quantity,
                responded,
                sample_ordered,
                sample_shipped,
                order_placed
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
        `;

        db.mainDb(
            query,
            [
                reqData.enquiry_id,
                reqData.customer_id,
                reqData.enquired_on,
                reqData.product_name,
                reqData.quantity,
                reqData.responded,
                reqData.sample_ordered,
                reqData.sample_shipped,
                reqData.order_placed
            ],
            (err, result) => {

                if (err) {
                    return res.json({
                        status: 0,
                        message: "DB error"
                    });
                }

                return res.json({
                    status: 1,
                    message: "Sample enquiry created successfully"
                });

            }
        );

    });

};






exports.getSampleEnquiries = (req, res) => {

    db.mainDb(
        `SELECT * FROM sample_enquiry ORDER BY enquiry_id DESC`,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });

        }
    );

};



exports.getSampleEnquiry = (req, res) => {

    const id = req.params.id;

    db.mainDb(
        `SELECT * FROM sample_enquiry WHERE enquiry_id=?`,
        [id],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            if (result.length == 0) {

                return res.json({
                    status: 0,
                    message: "Sample enquiry not found"
                });

            }

            return res.json({
                status: 1,
                data: result[0]
            });

        }
    );

};




exports.updateSampleEnquiry = (req, res) => {

    const reqData = req.body;

    const v = new Validator(reqData, {
        enquiry_id: 'required|integer',
        customer_id: 'required|integer',
        enquired_on: 'required|date',
        product_name: 'required|string|maxLength:255',
        quantity: 'required|integer',
        responded: 'required|string',
        sample_ordered: 'required|string',
        sample_shipped: 'required|string',
        order_placed: 'required|string'
    });

    v.check().then((matched) => {

        if (!matched) {

            const error_message = Object.values(v.errors)
                .map(e => e.message)
                .join(", ");

            return res.json({
                status: 0,
                message: error_message
            });

        }

        const query = `
            UPDATE sample_enquiry
            SET
                customer_id=?,
                enquired_on=?,
                product_name=?,
                quantity=?,
                responded=?,
                sample_ordered=?,
                sample_shipped=?,
                order_placed=?
            WHERE enquiry_id=?
        `;

        db.mainDb(
            query,
            [
                reqData.customer_id,
                reqData.enquired_on,
                reqData.product_name,
                reqData.quantity,
                reqData.responded,
                reqData.sample_ordered,
                reqData.sample_shipped,
                reqData.order_placed,
                reqData.enquiry_id
            ],
            (err, result) => {

                if (err) {

                    return res.json({
                        status: 0,
                        message: "DB error"
                    });

                }

                if (result.affectedRows == 0) {

                    return res.json({
                        status: 0,
                        message: "Sample enquiry not found"
                    });

                }

                return res.json({
                    status: 1,
                    message: "Sample enquiry updated successfully"
                });

            }
        );

    });

};


exports.deleteSampleEnquiry = (req, res) => {

    const id = req.body.enquiry_id;

    db.mainDb(
        `DELETE FROM sample_enquiry WHERE enquiry_id=?`,
        [id],
        (err, result) => {

            if (err) {

                return res.json({
                    status: 0,
                    message: "DB error"
                });

            }

            if (result.affectedRows == 0) {

                return res.json({
                    status: 0,
                    message: "Sample enquiry not found"
                });

            }

            return res.json({
                status: 1,
                message: "Sample enquiry deleted successfully"
            });

        }
    );

};

//-------------------------------------------------------------------

// Real (non-mocked) admin notification feed. Combines recent creates/
// updates read directly from each table's own timestamp columns with
// deletion events recorded in activity_log (see logActivity above), since
// deleted rows can't be reconstructed after the fact. Each UNION branch is
// independently capped at 20 rows before the final sort + limit so one
// noisy table can't starve the others out of a 20-row page.
// Table collations differ (older tables are utf8mb4_general_ci, newer ones
// default to the server's utf8mb4_0900_ai_ci) — UNION refuses to combine
// text columns of different collations, so every text column is coerced to
// a single common collation explicitly.
const RECENT_ACTIVITY_QUERY = `
    (
        SELECT CONVERT('quote_created' USING utf8mb4) COLLATE utf8mb4_general_ci AS action_type,
               CONVERT(CONCAT('New quote enquiry from ', first_name, ' ', last_name, ' \u2014 ', product_name) USING utf8mb4) COLLATE utf8mb4_general_ci AS description,
               CONVERT(COALESCE(reference_number, CONCAT('#', id)) USING utf8mb4) COLLATE utf8mb4_general_ci AS reference_id,
               created_date AS activity_time
        FROM get_enquire_quote
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('contact_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New contact enquiry from ', first_name, ' ', last_name, ' \u2014 ', subject) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(COALESCE(reference_number, CONCAT('#', id)) USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM contact_us_enquiry
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('enquiry_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New general enquiry from ', first_name, ' ', last_name, ' \u2014 ', product_category) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(COALESCE(reference_number, CONCAT('#', id)) USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM enquiries
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('sample_enquiry_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New sample enquiry \u2014 ', product_name, ' (qty ', quantity, ')') USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('#', enquiry_id) USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_at
        FROM sample_enquiry
        ORDER BY created_at DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('order_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New order placed \u2014 ', product_name) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(order_id USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM order_tracking
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('product_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('Product added \u2014 ', product_name) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(product_code USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM product_master
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('product_updated' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('Product updated \u2014 ', product_name) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(product_code USING utf8mb4) COLLATE utf8mb4_general_ci,
               updated_date
        FROM product_master
        WHERE updated_date > created_date
        ORDER BY updated_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT('customer_created' USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('New customer added \u2014 ', customer_name) USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(CONCAT('#', id) USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_date
        FROM customer_master
        ORDER BY created_date DESC LIMIT 20
    )
    UNION ALL
    (
        SELECT CONVERT(action_type USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(description USING utf8mb4) COLLATE utf8mb4_general_ci,
               CONVERT(reference_id USING utf8mb4) COLLATE utf8mb4_general_ci,
               created_at
        FROM activity_log
        ORDER BY created_at DESC LIMIT 20
    )
    ORDER BY activity_time DESC
    LIMIT 20
`;

exports.getRecentActivity = (req, res) => {

    db.mainDb(
        RECENT_ACTIVITY_QUERY,
        [],
        (err, result) => {

            if (err) {
                return res.json({
                    status: 0,
                    message: "DB error"
                });
            }

            return res.json({
                status: 1,
                data: result
            });
        }
    );

};

//-------------------------------------------------------------------
// Dashboard — real (non-mocked) stats, monthly graph data and enquiry
// previews. sample_enquiry has no status column (only per-step Yes/No
// flags), so it's counted toward the Total but deliberately excluded from
// Pending/Completed — it doesn't share the Pending / Mark as Done workflow
// the other three enquiry tables use, and guessing a mapping would
// misclassify its records.
//-------------------------------------------------------------------

function dbQueryAsync(query, values = []) {
    return new Promise((resolve, reject) => {
        db.mainDb(query, values, (err, result) => {
            if (err) reject(err); else resolve(result);
        });
    });
}

exports.getDashboardStats = async (req, res) => {
    try {
        const [row] = await dbQueryAsync(`
            SELECT
                (SELECT COUNT(*) FROM get_enquire_quote) +
                (SELECT COUNT(*) FROM contact_us_enquiry) +
                (SELECT COUNT(*) FROM enquiries) +
                (SELECT COUNT(*) FROM sample_enquiry) AS total,

                (SELECT COUNT(*) FROM get_enquire_quote  WHERE status = 'Pending') +
                (SELECT COUNT(*) FROM contact_us_enquiry WHERE status = 'Pending') +
                (SELECT COUNT(*) FROM enquiries          WHERE status = 'Pending') AS pending,

                (SELECT COUNT(*) FROM get_enquire_quote  WHERE status = 'Mark as Done') +
                (SELECT COUNT(*) FROM contact_us_enquiry WHERE status = 'Mark as Done') +
                (SELECT COUNT(*) FROM enquiries          WHERE status = 'Mark as Done') AS completed
        `);

        return res.json({
            status: 1,
            data: {
                total:     Number(row.total)     || 0,
                pending:   Number(row.pending)   || 0,
                completed: Number(row.completed) || 0,
            }
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

const MONTH_NAMES = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
const MONTHLY_LOOKBACK = 6;

exports.getMonthlyEnquiries = async (req, res) => {
    try {
        const now = new Date();
        const months = [];
        for (let i = MONTHLY_LOOKBACK - 1; i >= 0; i--) {
            const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
            months.push({
                key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`,
                label: `${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`,
            });
        }
        const startDate = `${months[0].key}-01`;

        const [quoteRows, contactRows, generalRows, sampleRows] = await Promise.all([
            dbQueryAsync(`SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM get_enquire_quote  WHERE created_date >= ? GROUP BY ym`, [startDate]),
            dbQueryAsync(`SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM contact_us_enquiry WHERE created_date >= ? GROUP BY ym`, [startDate]),
            dbQueryAsync(`SELECT DATE_FORMAT(created_date, '%Y-%m') AS ym, COUNT(*) AS cnt FROM enquiries          WHERE created_date >= ? GROUP BY ym`, [startDate]),
            dbQueryAsync(`SELECT DATE_FORMAT(created_at,  '%Y-%m') AS ym, COUNT(*) AS cnt FROM sample_enquiry     WHERE created_at  >= ? GROUP BY ym`, [startDate]),
        ]);

        const toMap = (rows) => rows.reduce((acc, r) => { acc[r.ym] = Number(r.cnt); return acc; }, {});
        const quoteMap = toMap(quoteRows), contactMap = toMap(contactRows), generalMap = toMap(generalRows), sampleMap = toMap(sampleRows);

        const data = months.map(m => ({
            month:   m.label,
            general: generalMap[m.key] || 0,
            contact: contactMap[m.key] || 0,
            quote:   quoteMap[m.key]   || 0,
            sample:  sampleMap[m.key]  || 0,
        }));

        return res.json({ status: 1, data });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

exports.getLatestEnquiries = async (req, res) => {
    try {
        const [general, contact, quote] = await Promise.all([
            dbQueryAsync(`SELECT * FROM enquiries          ORDER BY created_date DESC LIMIT 2`),
            dbQueryAsync(`SELECT * FROM contact_us_enquiry ORDER BY created_date DESC LIMIT 2`),
            dbQueryAsync(`SELECT * FROM get_enquire_quote  ORDER BY created_date DESC LIMIT 2`),
        ]);

        return res.json({
            status: 1,
            data: { general, contact, quote }
        });
    } catch (err) {
        return res.json({ status: 0, message: "DB error" });
    }
};

















