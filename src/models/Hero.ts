import mongoose from "mongoose";

export interface IHero {
  id: number;
  name: string;
  localized_name: string;
  image_url: string;
}

const HeroSchema = new mongoose.Schema({
  id: { type: Number, required: true, unique: true },
  name: { type: String, required: true },
  localized_name: { type: String, required: true },
  image_url: { type: String, required: true },
});

export default mongoose.model<IHero>("Hero", HeroSchema);
