function initializePaginatedContent() {
    let containers = document.querySelectorAll(".paginated-container")

    for (let container of containers) {
        let pageSizeInput = container.querySelector("input.page-size")
        let paginations = container.querySelectorAll(".pagination")
        let contents = container.querySelectorAll(".paginated-content")
        let group = container.getAttribute("pagination-group")
        let flags = { isFirst: true }
        let refreshEllipsis = (param) => {
            if (flags.isFirst) return
            let maxWidth = container.offsetWidth / 2
            for (let pagination of paginations) {
                let buttons = pagination.querySelector("ul.pagination-list")
                if (buttons.childElementCount == 0) return
                let show = (index) => buttons.querySelector("li[tab-index=\"" + index + "\"]").style.display = "block"
                let hide = (index) => buttons.querySelector("li[tab-index=\"" + index + "\"]").style.display = "none"
                let previousButton = pagination.querySelector("a.pagination-previous")
                let nextButton = pagination.querySelector("a.pagination-next")
                let leftEllipsis = buttons.querySelector("li.ellipsis-left")
                let rightEllipsis = buttons.querySelector("li.ellipsis-right")
                let width = buttons.firstChild.offsetWidth.toString()
                leftEllipsis.style.width = width + "px"
                rightEllipsis.style.width = width + "px"
                let count = buttons.childElementCount - 2
                let maxButtonCount = Math.max((buttons.firstChild.offsetWidth == 0) ? 5 : Math.trunc(maxWidth / buttons.firstChild.offsetWidth), 5)
                let current = (param instanceof HTMLElement) ? param : buttons.querySelector("li.is-active")
                let index = parseInt((current == null) ? 0 : current.getAttribute("tab-index"))
                if (index == 0) previousButton.setAttribute("disabled", "")
                else previousButton.removeAttribute("disabled")
                if (index == (count - 1)) nextButton.setAttribute("disabled", "")
                else nextButton.removeAttribute("disabled")
                if (count <= maxButtonCount) {
                    for (let i = 0; i < count; i++) buttons.querySelector("li[tab-index=\"" + i + "\"]").style.display = "block"
                    leftEllipsis.style.display = "none"
                    rightEllipsis.style.display = "none"
                } else {
                    maxButtonCount = Math.trunc((maxButtonCount - 1) / 2) * 2 + 1
                    let maxSurroundingButtonCount = (maxButtonCount - 5) / 2
                    let maxNoEllipsisIndex = maxButtonCount - 2 - maxSurroundingButtonCount - 1

                    if (index <= maxNoEllipsisIndex) {
                        for (let i = 0; i <= (maxNoEllipsisIndex + maxSurroundingButtonCount); i++) show(i)
                        for (let i = (maxNoEllipsisIndex + maxSurroundingButtonCount) + 1; i < count - 1; i++) hide(i)
                        show(count - 1)
                        leftEllipsis.style.display = "none"
                        rightEllipsis.style.display = "block"
                    } else if (index >= (count - maxNoEllipsisIndex - 1)) {
                        for (let i = 1; i < (count - maxNoEllipsisIndex - maxSurroundingButtonCount - 1); i++) hide(i)
                        for (let i = (count - maxNoEllipsisIndex - maxSurroundingButtonCount - 1); i < count; i++) show(i)
                        show(0)
                        leftEllipsis.style.display = "block"
                        rightEllipsis.style.display = "none"
                    } else {
                        for (let i = 1; i < (index - maxSurroundingButtonCount); i++) hide(i)
                        for (let i = (index - maxSurroundingButtonCount); i <= (index + maxSurroundingButtonCount); i++) show(i)
                        for (let i = (index + maxSurroundingButtonCount) + 1; i < count - 1; i++) hide(i)
                        show(0)
                        show(count - 1)
                        leftEllipsis.style.display = "block"
                        rightEllipsis.style.display = "block"
                    }
                }
            }
        }
        let refresh = () => {
            if ((pageSizeInput == null) || (parseInt(pageSizeInput.value) <= 0)) {
                for (let pagination of paginations) pagination.style.display = "none"
                return
            }
            let pageSize = parseInt(pageSizeInput.value)
            let pageCount = Math.ceil(contents.length / pageSize)
            if (!flags.isFirst && (flags.pageSize == pageSize) && (flags.pageCount == pageCount)) return
            for (let pagination of paginations) {
                let buttons = pagination.querySelector("ul.pagination-list")
                buttons.innerHTML = ""
                buttons.id = "tabs"
            }
            for (let i = 0; i < pageCount; i++) {
                for (let j = i * pageSize; j < (i + 1) * pageSize; j++) {
                    if (contents[j] == null) break
                    contents[j].classList.add("tab-content")
                    contents[j].setAttribute("tab-group", group)
                    contents[j].setAttribute("tab-index", i)
                    if ((i == 0) && (flags.isFirst || (flags.pageCount != pageCount))) contents[j].classList.add("is-active")
                    if (j == ((i + 1) * pageSize - 1)) for (let td of contents[j].querySelectorAll("td")) td.style.borderBottom = "0"
                }
                if (pageCount > 1) for (let pagination of paginations) {
                    let buttons = pagination.querySelector("ul.pagination-list")
                    let a = document.createElement("a")
                    a.classList.add("pagination-link")
                    a.innerText = i + 1
                    let li = document.createElement("li")
                    li.appendChild(a)
                    if ((i == 0) && (flags.isFirst || (flags.pageCount != pageCount))) {
                        li.classList.add("is-active")
                        a.classList.add("is-current")
                    }
                    li.setAttribute("tab-group", group)
                    li.setAttribute("tab-index", i)
                    buttons.appendChild(li)
                    li.addEventListener("click", () => {
                        refreshEllipsis(li)
                    })
                }
            }
            if (pageCount > 1) for (let pagination of paginations) {
                pagination.style.display = "flex"
                let buttons = pagination.querySelector("ul.pagination-list")
                let leftEllipsis = document.createElement("li")
                leftEllipsis.style.display = "none"
                leftEllipsis.classList.add("ellipsis-left", "ignore")
                leftEllipsis.innerHTML = "<span class=\"pagination-ellipsis\">&hellip;</span>"
                let rightEllipsis = document.createElement("li")
                rightEllipsis.style.display = "none"
                rightEllipsis.classList.add("ellipsis-right", "ignore")
                rightEllipsis.innerHTML = "<span class=\"pagination-ellipsis\">&hellip;</span>"
                buttons.firstChild.after(leftEllipsis)
                buttons.lastChild.before(rightEllipsis)

                let previousButton = pagination.querySelector("a.pagination-previous")
                let nextButton = pagination.querySelector("a.pagination-next")
                previousButton.addEventListener("click", () => {
                    let current = buttons.querySelector("li.is-active")
                    let index = parseInt(current.getAttribute("tab-index"))
                    if (index <= 0) return
                    let prev = buttons.querySelector("li[tab-index=\"" + (index - 1) + "\"]")
                    prev.dispatchEvent(new Event("click"))
                })
                nextButton.addEventListener("click", () => {
                    let current = buttons.querySelector("li.is-active")
                    let index = parseInt(current.getAttribute("tab-index"))
                    if (index >= (buttons.childElementCount - 3)) return // includes left & right ellipsis
                    let next = buttons.querySelector("li[tab-index=\"" + (index + 1) + "\"]")
                    next.dispatchEvent(new Event("click"))
                })
            } else for (let pagination of paginations) pagination.style.display = "none"
            flags.pageCount = pageCount
            flags.pageSize = pageSize
            flags.isFirst = false
        }
        refresh()
        pageSizeInput.addEventListener("change", refresh)
        let o = new ResizeObserver(refreshEllipsis)
        o.observe(container)
    }
}

function initializeTabs() {
    let tabs = document.querySelectorAll("#tabs li")
    let tabContents = document.querySelectorAll("#tab-content, .tab-content")
    let updateActiveTab = (tabGroup, tabIndex) => {
        for (let t of tabs) if (t && (t.getAttribute("tab-group") == tabGroup)) {
            if (t.getAttribute("tab-index") != tabIndex) {
                t.classList.remove("is-active")
                for (let a of t.querySelectorAll("a")) a.classList.remove("is-current")
            } else {
                t.classList.add("is-active")
                for (let a of t.querySelectorAll("a")) a.classList.add("is-current")
            }
        }
    }

    let updateActiveContent = (tabGroup, tabIndex) => {
        for (let item of tabContents) {
            let group = item.getAttribute("tab-group")
            let index = item.getAttribute("tab-index")
            if (item && (group == tabGroup)) item.classList.remove("is-active")
            if ((index == tabIndex) && (group == tabGroup)) item.classList.add("is-active")
        }
    }
    for (let t of tabs) {
        if (!t.classList.contains("disabled") && !t.classList.contains("ignore")) t.addEventListener("click", () => {
            let group = t.getAttribute("tab-group")
            let index = t.getAttribute("tab-index")
            updateActiveTab(group, index)
            updateActiveContent(group, index)
        })
    }
}

function initializeToggles() {
    let toggles = document.querySelectorAll(".card-header .card-toggle")
    let contents = document.querySelectorAll(".card-content")

    for (let t of toggles) {
        let card = t.getAttribute("card")
        if (card == null) continue
        let cc = []
        for (let c of contents) if (c.getAttribute("card") == card) cc.push(c)
        t.style.transition = "0.2s linear"
        t.addEventListener("click", (e) => {
            if (e.currentTarget.style.transform == "rotate(180deg)") {
                e.currentTarget.style.transform = ""
                for (let c of cc) c.classList.remove("is-hidden")
            } else {
                e.currentTarget.style.transform = "rotate(180deg)"
                for (let c of cc) c.classList.add("is-hidden")
            }
        })
    }
}

function initializeModals() {
    let modaltriggers = $(".modal-trigger")
    for (let t of modaltriggers) {
        let m = t.querySelector(".modal")
        let c = m.querySelectorAll("#close")
        t.addEventListener("click", (e) => { m.style.display = "flex" })
        for (let v of c) v.addEventListener("click", (e) => {
            m.style.display = "none"
            e.stopPropagation()
        })
    }
}

function initializeFormSelects() {
    let formSelects = document.querySelectorAll("#form-select")
    for (let s of formSelects) {
        let input = s.querySelector("input#form-select-input")
        let select = s.querySelector("select#form-select-select")
        let options = select.querySelectorAll("option")
        for (let i = 0; i < options.length; i++) {
            let o = options[i]
            let value = (o.getAttribute("value") == null) ? i : o.getAttribute("value")
            let enabled = (o.getAttribute("disabled") == null) ? true : false
            if (value == input.value) select.selectedIndex = i
            if (!enabled) o.style.display = "none"
        }
        select.addEventListener("change", () => {
            for (let i = 0; i < options.length; i++) {
                let o = options[i]
                if (o.selected) {
                    input.value = (o.getAttribute("value") == null) ? i : o.getAttribute("value")
                    input.dispatchEvent(new Event("change"))
                    break
                }
            }
        })
    }
}

function initializeFormPaginations() {
    let formPags = document.querySelectorAll("#form-pagination")
    for (let p of formPags) {
        let input = p.querySelector("input#form-pagination-input")
        let options = p.querySelectorAll("ul.pagination-list li a.pagination-link")
        for (let i = 0; i < options.length; i++) {
            let o = options[i]
            let value = (o.getAttribute("value") == null) ? i : o.getAttribute("value")
            if (value == input.value) {
                if (!o.classList.contains("is-current")) o.classList.add("is-current")
            } else o.classList.remove("is-current")
            o.addEventListener("click", () => {
                for (let i = 0; i < options.length; i++) options[i].classList.remove("is-current")
                if (!o.classList.contains("is-current")) o.classList.add("is-current")
                input.value = (o.getAttribute("value") == null) ? i : o.getAttribute("value")
            })
        }
    }
}

function initializeFormValidation() {
    let forms = document.querySelectorAll("form#validatable")
    for (let f of forms) {
        let validatableFields = f.querySelectorAll(".field#validatable")
        let validatableButtons = f.querySelectorAll("button#validatable")

        let getParams = (input) => {
            return {
                minLength: input.getAttribute("min-length"),
                maxLength: input.getAttribute("max-length"),
                recommendedLength: input.getAttribute("recommended-length"),
                minPattern: input.getAttribute("min-pattern"),
                recommendedPattern: input.getAttribute("recommended-pattern"),
                isNumeric: (input.getAttribute("numeric") != null) ? true : false
            }
        }
        let isValid = (value, params) => {
            let t = value.trim()
            if (params.minLength != null) if (t.length < parseInt(params.minLength)) return false
            if (params.maxLength != null) if (t.length > parseInt(params.maxLength)) return false
            if (params.minPattern != null) if (!(new RegExp(params.minPattern).test(t))) return false
            if (params.isNumeric == true) if (parseInt(t).toString() != t) return false
            return true
        }

        let isFormValid = () => {
            for (let field of validatableFields) for (let i of field.querySelectorAll("input#validatable")) if (!isValid(i.value, getParams(i))) return false
            return true
        }

        for (let field of validatableFields) {
            let inputs = field.querySelectorAll("input#validatable")
            let tips = field.querySelectorAll(".help")
            for (let i of inputs) i.addEventListener("change", () => {
                let params = getParams(i)
                // inputs
                if (isValid(i.value, params)) {
                    i.classList.remove("is-danger")
                    for (let t of tips) t.classList.remove("is-danger")
                } else if (!i.classList.contains("is-danger")) {
                    i.classList.add("is-danger")
                    for (let t of tips) t.classList.add("is-danger")
                }
                // buttons
                if (isFormValid()) {
                    for (let b of validatableButtons) b.removeAttribute("disabled")
                } else {
                    for (let b of validatableButtons) if (b.getAttribute("disabled") == null) b.setAttribute("disabled", "")
                }
            })
        }
    }
}

function initializeFormCollections() {
    let collections = document.querySelectorAll("#form-collection")
    for (let c of collections) {
        let maxLength = parseInt(c.getAttribute("max-length"))
        let fallbackValue = JSON.parse(c.getAttribute("fallback"))
        let input = c.querySelector("#form-collection-input")
        let tags = c.querySelectorAll("#form-collection-tag")
        let modButton = c.querySelector("#form-collection-modify")
        let modTable = c.querySelector("table#multi-select")
        let modInput = modTable.querySelector("input#multi-select-input")
        let modTitle = modTable.querySelector("input#multi-select-title")
        let deleteButtonClickEventListener = (tag) => () => {
            let tvalue = JSON.parse(tag.getAttribute("value"))
            let value = JSON.parse(input.value)
            value.splice(value.indexOf(tvalue), 1)
            if (fallbackValue != null) value.push(fallbackValue)
            input.value = JSON.stringify(value)
            modInput.value = input.value
            modInput.dispatchEvent(new Event("change"))
            tag.remove()
        }

        for (let t of tags) {
            let d = t.querySelector(".delete, .is-delete")
            d.addEventListener("click", deleteButtonClickEventListener(t))
        }
        modInput.value = input.value
        modInput.setAttribute("max-length", maxLength)
        modInput.setAttribute("fallback", JSON.stringify(fallbackValue))
        modInput.addEventListener("change", () => {
            let fallbackValue = JSON.parse(c.getAttribute("fallback"))
            let oldValue = JSON.parse(input.value)
            let newValue = JSON.parse(modInput.value)
            let tags = c.querySelectorAll("#form-collection-tag")
            for (let o of oldValue) if (!newValue.includes(o) && (o != fallbackValue)) {
                for (let t of tags) if (JSON.parse(t.getAttribute("value")) == o) t.remove()
            }
            for (let n = 0; n < newValue.length; n++) if (!oldValue.includes(newValue[n]) && (newValue[n] != fallbackValue)) {
                let tag = document.createElement("div")
                tag.classList.add("control")
                tag.id = "form-collection-tag"
                tag.setAttribute("value", newValue[n])
                tag.innerHTML = "<span class=\"tags has-addons\"><span class=\"tag is-link is-light\" id=\"form-collection-tag-title\">" + JSON.parse(modTitle.value)[n] + "</span><a class=\"tag is-delete\" /></span>"
                tag.querySelector("a.is-delete").addEventListener("click", deleteButtonClickEventListener(tag))
                modButton.before(tag)
            }
            input.value = modInput.value
        })
    }
}

function initializeMultiSelectTables() {
    let tables = document.querySelectorAll("table#multi-select")
    for (let table of tables) {
        let valueInput = table.querySelector("input#multi-select-input")
        let titleInput = table.querySelector("input#multi-select-title")
        let trimValues = (values, fallback) => {
            while (values.includes(fallback)) values.splice(values.indexOf(fallback), 1)
            return values
        }
        let fillValues = (values, fallback) => {
            let maxLength = (valueInput.getAttribute("max-length") == null) ? -1 : parseInt(valueInput.getAttribute("max-length"))
            while (values.length < maxLength) values.push(fallback)
            return values
        }
        let lines = table.querySelectorAll("tbody tr")
        let refresh = () => {
            let fallbackValue = JSON.parse(valueInput.getAttribute("fallback"))
            let value = trimValues(JSON.parse(valueInput.value), fallbackValue)
            let title = []
            for (let l of lines) {
                let lvalue = JSON.parse(l.getAttribute("multi-select-value"))
                if (value.includes(lvalue)) {
                    if (!l.classList.contains("is-selected")) l.classList.add("is-selected")
                    title[value.indexOf(lvalue)] = l.getAttribute("multi-select-title")
                    l.style.fontWeight = "bold"
                } else {
                    l.classList.remove("is-selected")
                    l.style.fontWeight = ""
                }
            }
            titleInput.value = JSON.stringify(title)
        }

        for (let l of lines) {
            l.onclick = () => {
                let fallbackValue = JSON.parse(valueInput.getAttribute("fallback"))
                let maxLength = (valueInput.getAttribute("max-length") == null) ? -1 : parseInt(valueInput.getAttribute("max-length"))
                let value = trimValues(JSON.parse(valueInput.value), fallbackValue)
                let lvalue = JSON.parse(l.getAttribute("multi-select-value"))
                if (value.includes(lvalue)) value.splice(value.indexOf(lvalue), 1)
                else if (maxLength >= 0) {
                    if (value.length < maxLength) value.push(lvalue)
                    else alert("Cannot add more items, items are up to " + maxLength + ".")
                } else value.push(lvalue)
                valueInput.value = JSON.stringify(fillValues(value, fallbackValue))
                refresh()
                valueInput.dispatchEvent(new Event("change"))
            }
            refresh()
        }
        valueInput.addEventListener("change", refresh)
    }
}

function initializeFormNumerics() {
    let numerics = document.querySelectorAll("#form-numeric")
    for (let n of numerics) {
        let add = n.querySelector("#form-numeric-add")
        let sub = n.querySelector("#form-numeric-sub")
        let inputs = n.querySelectorAll("#form-numeric-input")
        add.addEventListener("click", (e) => {
            for (let i of inputs) {
                let maxValue = parseFloat(i.getAttribute("max-value"))
                let step = parseFloat(i.getAttribute("step"))

                let digitCount = (i.getAttribute("digit-count") == null) ? -1 : parseInt(i.getAttribute("digit-count"))
                let value = (parseFloat(i.value) * 10 + step * 10) / 10
                if (value * Math.sign(step) <= maxValue * Math.sign(step)) i.value = (digitCount >= 0) ? value.toFixed(digitCount) : value
            }
            e.stopPropagation()
        })
        sub.addEventListener("click", (e) => {
            for (let i of inputs) {
                let minValue = parseFloat(i.getAttribute("min-value"))
                let step = parseFloat(i.getAttribute("step"))
                let digitCount = (i.getAttribute("digit-count") == null) ? -1 : parseInt(i.getAttribute("digit-count"))
                let value = (parseFloat(i.value) * 10 - step * 10) / 10
                if (value * Math.sign(step) >= minValue * Math.sign(step)) i.value = (digitCount >= 0) ? value.toFixed(digitCount) : value
            }
            e.stopPropagation()
        })
        for (let i of inputs) {
            let digitCount = (i.getAttribute("digit-count") == null) ? -1 : parseInt(i.getAttribute("digit-count"))
            let value = parseFloat(i.value)
            i.value = (digitCount >= 0) ? value.toFixed(digitCount) : value
        }
    }
}

function initializeUploader() {
    let uploaders = document.querySelectorAll("div#uploader")
    for (let uploader of uploaders) {
        let input = uploader.querySelector("input#uploader-input")
        let text = uploader.querySelector("input#uploader-text")
        let placeholder = uploader.querySelector("#uploader-placeholder")
        let remove = uploader.querySelector("#uploader-delete")
        let reader = new FileReader()
        input.addEventListener("change", () => {
            if (input.files.length > 0) {
                remove.style.display = "block"
                placeholder.innerText = input.files[0].name
                reader.readAsText(input.files[0])
                reader.onload = () => text.value = reader.result
            } else {
                placeholder.innerText = ""
                remove.style.display = "none"
                text.value = null
            }
        })
        remove.addEventListener("click", (e) => {
            e.stopPropagation()
            input.value = null
            input.dispatchEvent(new Event("change"))
        })

        remove.style.display = "none"
    }
}

function checkImg() {
    let imgs = document.querySelectorAll("#exist-or-not")
    for (let img of imgs) {
        let general = img.querySelector("img#general")
        let specified = img.querySelector("img#specified")

        if (specified.width == 0) specified.style.display = "none"
        else general.style.display = "none"
    }
}

function initializeMarqueeLabels() {
    let marqueeContainers = document.querySelectorAll(".marquee-label-container")
    for (let c of marqueeContainers) {
        let marquees = c.querySelectorAll(".marquee-label")
        for (let marquee of marquees) {
            if (marquee.closest(".marquee-label-container") != c) continue
            let refresh = () => {
                let lpad = parseInt(window.getComputedStyle(c, null).getPropertyValue("padding-left"))
                if (lpad == NaN) lpad = 0
                let rpad = parseInt(window.getComputedStyle(c, null).getPropertyValue("padding-right"))
                if (rpad == NaN) rpad = 20
                let hpad = lpad + rpad
                let speed = marquee.getAttribute("speed")
                if (speed == null) speed = 1
                let stopingTime = 0.5
                let duration = (20 * (marquee.offsetWidth - c.offsetWidth + hpad)) / speed + 2 * stopingTime
                if ((marquee.offsetWidth > 0) && (marquee.offsetWidth > c.offsetWidth - hpad)) {
                    marquee.animate([
                        { transform: "translateX(0)", offset: 0 },
                        { transform: "translateX(0)", easing: "cubic-bezier(0.67, 0, 0.33, 1)", offset: stopingTime / duration },
                        { transform: "translateX(" + (c.offsetWidth - marquee.offsetWidth - hpad) + "px)", easing: "cubic-bezier(0.67, 0, 0.33, 1)", offset: 1 - stopingTime / duration },
                        { transform: "translateX(" + (c.offsetWidth - marquee.offsetWidth - hpad) + "px)", offset: 1 }
                    ], { duration: (20 * (marquee.offsetWidth - c.offsetWidth) + 1000) / speed, direction: "alternate-reverse", iterations: Infinity })
                } else marquee.style.animation = "none"
            }
            let o = new ResizeObserver(refresh)
            o.observe(c)
        }
    }
}

function initializeNotificatioAnimation() {
    let notifications = document.querySelectorAll(".notification.temporary")
    for (let n of notifications) {
        let remove = n.querySelector(".delete")
        let startSubmitter = n.querySelector("form.start")
        let startPath = startSubmitter.getAttribute("action")
        let startRequest = new XMLHttpRequest()
        startRequest.open("POST", startPath, true)
        startRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded")

        let endSubmitter = n.querySelector("form.end")
        let endPath = startSubmitter.getAttribute("action")
        let endRequest = new XMLHttpRequest()
        endRequest.open("POST", endPath, true)
        endRequest.setRequestHeader("Content-type", "application/x-www-form-urlencoded")

        if (startSubmitter != null) startRequest.send()
        let end = () => {
            n.style.display = "none"
            if (endSubmitter != null) endRequest.send()
        }

        n.style.animationPlayState = "running"
        remove.addEventListener("click", end)
        n.addEventListener("animationend", end)
        n.addEventListener("webkitAnimationEnd", end)
    }
}

function initializeCheckBoxes() {
    let checks = document.querySelectorAll(".checkbox")
    for (let c of checks) {
        let input = c.querySelector("input[type=checkbox]")
        let mark = c.querySelector(".checkmark")
        let refresh = (value) => {
            value = input.getAttribute("checked")
            if (value == null) {
                input.removeAttribute("checked")
                mark.style.opacity = 0
                if (!c.classList.contains("is-light")) c.classList.add("is-light")
            } else {
                input.setAttribute("checked", "checked")
                mark.style.opacity = 100
                c.classList.remove("is-light")
            }
        }
        c.addEventListener("click", () => {
            let value = input.getAttribute("checked")
            if (value == null) input.setAttribute("checked", "checked")
            else input.removeAttribute("checked")
            refresh()
        })
        refresh()
    }
}

function removeLoadingModal() {
    let loading = document.querySelector(".loading")
    setTimeout(() => (loading == null) ? null : loading.remove(), 505)
    try {
        let a = loading.animate([
            { offset: 0, opacity: 1 },
            { offset: 0.25, opacity: 0 },
            { offset: 1, opacity: 0 }
        ], { duration: 2000 })
        a.onfinish = loading.remove
        a.play()
    } catch { }
}

$(document).ready(() => {
    initializeNotificatioAnimation()
    initializePaginatedContent()
    initializeTabs()
    initializeToggles()
    initializeModals()
    initializeFormSelects()
    initializeFormNumerics()
    initializeFormPaginations()
    initializeFormValidation()
    initializeFormCollections()
    initializeMultiSelectTables()
    initializeUploader()
    checkImg()
    initializeMarqueeLabels()
    initializeCheckBoxes()

    removeLoadingModal()
})

