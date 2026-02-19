import { Injectable } from '@nestjs/common';
import { MovieCreditEntity } from '../../../database/entities/movie-credit.entity';
import { CreateCreditsDto } from '../../../modules/movies/dto/create-movie.dto';

@Injectable()
export class CreditEntityFactory {
  createFromDto(
    credits: CreateCreditsDto[],
    movieId?: string,
  ): Partial<MovieCreditEntity>[] {
    return credits.flatMap((credit) =>
      credit.roles.map((role) => ({
        ...(movieId && { movieId }),
        personId: credit.personId,
        roleId: role.roleId,
        characterName: role.characterName,
        orderIndex: role.orderIndex,
      })),
    );
  }

  extractUniqueRoleIds(credits: CreateCreditsDto[]): string[] {
    return [...new Set(credits.flatMap((c) => c.roles.map((r) => r.roleId)))];
  }

  extractUniquePersonIds(credits: CreateCreditsDto[]): string[] {
    return [...new Set(credits.map((c) => c.personId))];
  }
}
