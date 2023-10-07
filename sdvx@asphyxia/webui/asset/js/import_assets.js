document.querySelector('#import_assets').addEventListener('click', function() {
    emit("import_assets", {
        "path": document.querySelector('#path').value,
    }).then(function(data) {
        if (data.data.status == "ok") {
            alert("Imported successfully!")
        }
    }).catch(function(err) {
        console.log(err)
    });
});