import mongoose from "mongoose";
export const { Schema } = mongoose;
export const objectId = () => ({ type: Schema.Types.ObjectId, required: true });
export const optionalObjectId = () => ({ type: Schema.Types.ObjectId, default: null });
export const timestamps = { timestamps: true, versionKey: false, strict: "throw" };

// Human-readable sequential IDs are generated per collection, starting at 100.
// MongoDB's _id remains the internal relationship key.
const counterSchema = new Schema({ _id: String, seq: { type: Number, required: true } }, { versionKey: false });
const Counter = mongoose.models.SequenceCounter || mongoose.model("SequenceCounter", counterSchema);
const businessCodeFields = {
  Customer: ["customerCode", "CUS"], Supplier: ["supplierCode", "SUP"],
  OilType: ["oilCode", "OIL"], StorageLocation: ["locationCode", "LOC"]
};

async function nextRecordId(name, session) {
  const options = { upsert: true, new: true, setDefaultsOnInsert: true };
  if (session) options.session = session;
  // First generated value is 100. Atomic increment prevents duplicate IDs under concurrency.
  const counter = await Counter.findOneAndUpdate(
    { _id: `record:${name}` },
    [{ $set: { seq: { $add: [{ $ifNull: ["$seq", 99] }, 1] } } }],
    options
  );
  return counter.seq;
}

export const model = (name, schema) => {
  if (!schema.path("recordId")) {
    schema.add({ recordId: { type: Number, unique: true, index: true, immutable: true } });
  }
  const code = businessCodeFields[name];
  if (code && schema.path(code[0])) {
    schema.path(code[0]).required(false);
    schema.pre("validate", async function generateBusinessCode() {
      if (!this.isNew) return;
      if (this.recordId == null) this.recordId = await nextRecordId(name, this.$session());
      if (!this[code[0]]) this[code[0]] = `${code[1]}-${this.recordId}`;
    });
  } else {
    schema.pre("validate", async function generateRecordId() {
      if (this.isNew && this.recordId == null) this.recordId = await nextRecordId(name, this.$session());
    });
  }
  return mongoose.models[name] || mongoose.model(name, schema);
};
