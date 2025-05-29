import axios from "axios";
import Hero, { IHero } from "../models/Hero";

class DotaApiService {
  private readonly API_URL = "https://api.opendota.com/api/heroes";
  private readonly IMAGE_BASE_URL =
    "https://cdn.cloudflare.steamstatic.com/apps/dota2/images/dota_react/heroes";

  async fetchAndSaveHeroes(): Promise<IHero[]> {
    try {
      const response = await axios.get(this.API_URL);
      const heroes = response.data;
      const formattedHeroes = heroes.map((hero: any) => ({
        id: hero.id,
        name: hero.name,
        localized_name: hero.localized_name,
        image_url: `${this.IMAGE_BASE_URL}/${hero.localized_name.toLowerCase().replace(/\s+/g, '')}.png`,
      }));

      // Очищаем существующие записи и сохраняем новые
      await Hero.deleteMany({});
      await Hero.insertMany(formattedHeroes);

      return formattedHeroes;
    } catch (error) {
      console.error("Error fetching heroes:", error);
      throw error;
    }
  }

  async getHeroes(): Promise<IHero[]> {
    try {
      // Сначала проверяем, есть ли герои в базе
      const heroes = await Hero.find();

      if (heroes.length === 0) {
        // Если героев нет, получаем их из API
        return await this.fetchAndSaveHeroes();
      }

      return heroes;
    } catch (error) {
      console.error("Error getting heroes:", error);
      throw error;
    }
  }
}

export default new DotaApiService();
