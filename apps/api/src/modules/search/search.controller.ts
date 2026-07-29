import { Controller, Get, Query } from '@nestjs/common';
import { SearchService } from './search.service';
import { QuerySearchDto } from './dto/query-search.dto';

// Public — same as product/category browsing, no auth needed to search.
@Controller({ path: 'search', version: '1' })
export class SearchController {
  constructor(private readonly searchService: SearchService) {}

  @Get()
  search(@Query() query: QuerySearchDto) {
    return this.searchService.search(query);
  }
}
