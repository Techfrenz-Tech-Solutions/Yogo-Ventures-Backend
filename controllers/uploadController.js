exports.uploadImage = (req, res) => {
    if (!req.file) {
        return res.json({ status: 0, message: "No image file received" });
    }

    return res.json({
        status: 1,
        message: "Image uploaded successfully",
        filename: req.file.filename,
        url: `${req.protocol}://${req.get('host')}/storage/${req.file.filename}`
    });
};
