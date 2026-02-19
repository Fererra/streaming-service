import { Injectable } from '@nestjs/common';
import { MovieEntity } from '../../../database/entities/movie.entity';
import { MovieCreditEntity } from '../../../database/entities/movie-credit.entity';
import {
  MovieDetailsDto,
  PersonRolePreviewDto,
  MovieCreditsDto,
} from '../dto/movie-response.dto';

interface RoleLimits {
  [key: string]: number;
}

@Injectable()
export class MovieMapper {
  private static readonly ROLE_LIMITS: RoleLimits = {
    DIRECTOR: 2,
    ACTOR: 20,
  };

  toMovieDetailsDto(
    movie: MovieEntity,
    media: { posterUrl: string; trailerUrl: string | null },
  ): MovieDetailsDto {
    const groupedCredits = this.groupCreditsByRole(
      movie.credits,
      MovieMapper.ROLE_LIMITS,
    );

    return {
      id: movie.id,
      title: movie.title,
      posterUrl: media.posterUrl,
      trailerUrl: media.trailerUrl,
      releaseYear: movie.releaseYear,
      ageRating: movie.ageRating,
      durationMinutes: movie.durationMinutes,
      genres: movie.genres.map((g) => ({ id: g.id, name: g.name })),
      countries: movie.countries.map((c) => ({
        code: c.code,
        countryName: c.countryName,
      })),
      directors: this.mapCreditsToPreview(groupedCredits.get('DIRECTOR') ?? []),
      actors: this.mapCreditsToPreview(groupedCredits.get('ACTOR') ?? []),
    };
  }

  toMovieCreditsDto(credits: MovieCreditEntity[]): MovieCreditsDto[] {
    const roleMap = new Map<
      string,
      {
        role: { code: string; name: string };
        people: Map<
          string,
          {
            person: { id: string; name: string; photoPath: string | null };
            roles: {
              creditId: string;
              characterName: string | null;
              orderIndex: number | null;
            }[];
          }
        >;
      }
    >();

    for (const credit of credits) {
      const roleCode = credit.role.code;

      if (!roleMap.has(roleCode)) {
        roleMap.set(roleCode, {
          role: {
            code: roleCode,
            name: credit.role.role,
          },
          people: new Map(),
        });
      }

      const roleGroup = roleMap.get(roleCode)!;
      const personId = credit.person.id;

      if (!roleGroup.people.has(personId)) {
        roleGroup.people.set(personId, {
          person: {
            id: credit.person.id,
            name: `${credit.person.firstName} ${credit.person.lastName}`,
            photoPath: credit.person.photoPath,
          },
          roles: [],
        });
      }

      roleGroup.people.get(personId)!.roles.push({
        creditId: credit.id,
        characterName: credit.characterName,
        orderIndex: credit.orderIndex,
      });
    }

    return Array.from(roleMap.values()).map((roleGroup) => ({
      role: roleGroup.role,
      people: Array.from(roleGroup.people.values()),
    }));
  }

  private groupCreditsByRole(
    credits: MovieCreditEntity[],
    limits: RoleLimits,
  ): Map<string, MovieCreditEntity[]> {
    const grouped = new Map<string, MovieCreditEntity[]>();

    for (const credit of credits) {
      const roleCode = credit.role.code;
      if (!limits[roleCode]) continue;

      const list = grouped.get(roleCode) ?? [];
      list.push(credit);
      grouped.set(roleCode, list);
    }

    return grouped;
  }

  private mapCreditsToPreview(
    credits: MovieCreditEntity[],
  ): PersonRolePreviewDto[] {
    const limit =
      MovieMapper.ROLE_LIMITS[credits[0]?.role?.code] ?? credits.length;

    return credits
      .sort((a, b) => (a.orderIndex ?? 0) - (b.orderIndex ?? 0))
      .slice(0, limit)
      .map((c) => ({
        id: c.person.id,
        name: `${c.person.firstName} ${c.person.lastName}`,
        photoPath: c.person.photoPath,
        characterName: c.characterName,
      }));
  }
}
