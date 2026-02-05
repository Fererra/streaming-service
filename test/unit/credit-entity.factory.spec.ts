import { CreditEntityFactory } from 'src/modules/movies/factories/credit-entity.factory';
import { CreateCreditsDto } from 'src/modules/movies/dto/create-movie.dto';

describe('CreditEntityFactory', () => {
  let factory: CreditEntityFactory;

  beforeEach(() => {
    factory = new CreditEntityFactory();
  });

  describe('createFromDto', () => {
    it('should create credit entities from DTO without movieId', () => {
      const credits: CreateCreditsDto[] = [
        {
          personId: 'person-1',
          roles: [
            { roleId: 'role-1', characterName: 'Character 1', orderIndex: 1 },
            { roleId: 'role-2', characterName: null, orderIndex: 2 },
          ],
        },
      ];

      const result = factory.createFromDto(credits);

      expect(result).toHaveLength(2);
      expect(result[0]).toEqual({
        personId: 'person-1',
        roleId: 'role-1',
        characterName: 'Character 1',
        orderIndex: 1,
      });
      expect(result[1]).toEqual({
        personId: 'person-1',
        roleId: 'role-2',
        characterName: null,
        orderIndex: 2,
      });
    });

    it('should create credit entities from DTO with movieId', () => {
      const credits: CreateCreditsDto[] = [
        {
          personId: 'person-1',
          roles: [{ roleId: 'role-1', characterName: 'Hero', orderIndex: 1 }],
        },
      ];

      const result = factory.createFromDto(credits, 'movie-123');

      expect(result).toHaveLength(1);
      expect(result[0]).toEqual({
        movieId: 'movie-123',
        personId: 'person-1',
        roleId: 'role-1',
        characterName: 'Hero',
        orderIndex: 1,
      });
    });

    it('should handle multiple persons with multiple roles', () => {
      const credits: CreateCreditsDto[] = [
        {
          personId: 'person-1',
          roles: [{ roleId: 'role-1', characterName: 'Char1', orderIndex: 1 }],
        },
        {
          personId: 'person-2',
          roles: [
            { roleId: 'role-2', characterName: 'Char2', orderIndex: 2 },
            { roleId: 'role-3', characterName: 'Char3', orderIndex: 3 },
          ],
        },
      ];

      const result = factory.createFromDto(credits, 'movie-1');

      expect(result).toHaveLength(3);
      expect(result[0].personId).toBe('person-1');
      expect(result[1].personId).toBe('person-2');
      expect(result[2].personId).toBe('person-2');
    });

    it('should return empty array for empty credits', () => {
      const result = factory.createFromDto([]);

      expect(result).toEqual([]);
    });
  });

  describe('extractUniqueRoleIds', () => {
    it('should extract unique role IDs from credits', () => {
      const credits: CreateCreditsDto[] = [
        {
          personId: 'person-1',
          roles: [
            { roleId: 'role-1', characterName: null, orderIndex: 1 },
            { roleId: 'role-2', characterName: null, orderIndex: 2 },
          ],
        },
        {
          personId: 'person-2',
          roles: [
            { roleId: 'role-1', characterName: null, orderIndex: 3 },
            { roleId: 'role-3', characterName: null, orderIndex: 4 },
          ],
        },
      ];

      const result = factory.extractUniqueRoleIds(credits);

      expect(result).toHaveLength(3);
      expect(result).toContain('role-1');
      expect(result).toContain('role-2');
      expect(result).toContain('role-3');
    });

    it('should return empty array for empty credits', () => {
      const result = factory.extractUniqueRoleIds([]);

      expect(result).toEqual([]);
    });
  });

  describe('extractUniquePersonIds', () => {
    it('should extract unique person IDs from credits', () => {
      const credits: CreateCreditsDto[] = [
        {
          personId: 'person-1',
          roles: [{ roleId: 'role-1', characterName: null, orderIndex: 1 }],
        },
        {
          personId: 'person-2',
          roles: [{ roleId: 'role-2', characterName: null, orderIndex: 2 }],
        },
        {
          personId: 'person-1',
          roles: [{ roleId: 'role-3', characterName: null, orderIndex: 3 }],
        },
      ];

      const result = factory.extractUniquePersonIds(credits);

      expect(result).toHaveLength(2);
      expect(result).toContain('person-1');
      expect(result).toContain('person-2');
    });

    it('should return empty array for empty credits', () => {
      const result = factory.extractUniquePersonIds([]);

      expect(result).toEqual([]);
    });
  });
});
