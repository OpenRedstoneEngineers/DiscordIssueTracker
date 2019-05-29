class Argument {
    constructor(name, required) {
        this._name = name;
        this.required = required;
    }

    get name() {
        return this.name;
    }

    isRequired() {
        return this.required;
    }
}

module.exports = Argument;