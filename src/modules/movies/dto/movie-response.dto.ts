import { AgeRating } from '../age-rating.enum';

export class PersonRolePreviewDto {
  id: string;
  name: string;
  photoPath: string | null;
  characterName: string | null;
}

export class MovieDetailsDto {
  id: string;
  title: string;
  releaseYear: number;
  ageRating: AgeRating;
  durationMinutes: number;
  genres: { id: string; name: string }[];
  countries: { code: string; countryName: string }[];
  directors: PersonRolePreviewDto[];
  actors: PersonRolePreviewDto[];
}

export class MovieCreditsDto {
  role: {
    code: string;
    name: string;
  };
  people: {
    person: {
      id: string;
      name: string;
      photoPath: string | null;
    };
    roles: {
      creditId: string;
      characterName: string | null;
      orderIndex: number | null;
    }[];
  }[];
}
[];
