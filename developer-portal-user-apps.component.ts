import { Component, Input, OnInit } from '@angular/core';
import { UserAppsService } from '@developer-portal/services/user/apps-service/apps.service';
import { environment } from '@developer-portal/../environments/environment';
import { UserTeamsService } from '@developer-portal/services/user/teams-service/teams.service'
import { Subject, forkJoin, of } from 'rxjs';
import { ProvisionBaseComponent } from '@developer-portal/components/provision-base.component';
import { exhaustMap, map, retry, tap } from 'rxjs/operators';

@Component({
  selector: 'app-developer-portal-user-apps',
  templateUrl: './developer-portal-user-apps.component.html',
  styleUrls: ['./developer-portal-user-apps.component.scss'],
})
export class DeveloperPortalUserAppsComponent extends ProvisionBaseComponent implements OnInit {
  userApps = [];
  apiList = [];
  toggleSort: any = false;
  showLoadMore: boolean;
  noAppsAdded: boolean;
  displayApps = [];
  oldLength = 10;
  data: any;
  author: boolean;
  modalAddNewApp = '';
  apiProducts = [];
  addNewAppData = {
    name: '',
    description: '',
    owner: '',
    acceptSubmittingTerms: '',
  };
  teams = [];
  apiselected = false;
  getTeams: any;
  myTeam: any;
  loadingSuccess = new Subject<boolean>();

  constructor(
    private userAppsService: UserAppsService,
    private userTeamsService: UserTeamsService  ) {
    super();
  }

  ngOnInit(): void {
    this.addNewAppData.owner = this.data.userName;
  }

  loadContent(toLoad: boolean): void {
    if (toLoad && !this.author) {
      this.userAppsService.getUserApps(environment.userApps.operation.getbydevname).pipe(
        map(resp => resp.app),
        exhaustMap(apps => (apps && apps.length >0) ?
         forkJoin(apps.map(app => this.userAppsService.getSingleAppById(app.appId).pipe(map(resp => resp.app[0])))) :
          of([])
         ),
        tap(() => this.userTeamsService.getTeams(environment.userTeams.operation.getteam).subscribe(resp => {
          this.teams = resp.teams
        })),
        retry(2)
      ).subscribe(((finalApps) => {
        this.userApps = finalApps;
        if (!this.userApps || this.userApps.length === 0) {
          this.noAppsAdded = true;
        } else {
          this.noAppsAdded = false;
          if (this.userApps.length > 9) {
            this.showLoadMore = true;
          }
        }
        this.displayApps = finalApps.slice(0,this.oldLength);
        this.loadingSuccess.next(true);
      }), ((err) => {
        this.noAppsAdded = true;
        this.loadingSuccess.next(false)
      }));
    } else {
        this.loadingSuccess.next(false);
    }
  }

  loadMoreApps() {
    let newLength = this.oldLength + 10;
    if (newLength > this.userApps.length) {
      newLength = this.userApps.length;
      this.showLoadMore = false;
    }
    for (let i = this.oldLength; i < newLength; i++) {
      this.displayApps.push(this.userApps[i]);
    }
    this.oldLength = this.oldLength + 10;
  }

  sort(colName, sortCol, e) {
    this.oldLength = 10;
    this.displayApps = this.userApps.slice(0, 10);
    this.showLoadMore = true;
    if (sortCol === true) {
      e.target.classList.remove('desc');
      e.target.classList.add('asc');
      this.displayApps.sort((a, b) =>
        a[colName] > b[colName] ? 1 : a[colName] < b[colName] ? -1 : 0
      );
    } else {
      e.target.classList.remove('asc');
      e.target.classList.add('desc');
      this.displayApps.sort((a, b) =>
        a[colName] < b[colName] ? 1 : a[colName] > b[colName] ? -1 : 0
      );
    }
    this.toggleSort = !this.toggleSort;
  }

  sortDate(colName, sortCol, e) {
    this.oldLength = 10;
    this.displayApps = this.userApps.slice(0, 10);
    this.showLoadMore = true;
    if (sortCol === true) {
      e.target.classList.remove('desc');
      e.target.classList.add('asc');
      this.displayApps.sort((a, b) => {
        return a[colName] - b[colName];
      });
    } else {
      e.target.classList.remove('asc');
      e.target.classList.add('desc');
      this.displayApps.sort((a, b) => {
        return b[colName] - a[colName];
      });
    }
    this.toggleSort = !this.toggleSort;
  }

  redirectToDetails(appId) {
    sessionStorage.setItem('AppId', appId);
  }

  @Input()
  set json(input: string) {
    if (input) {
      this.data = JSON.parse(input);
    }
  }

  @Input()
  set authormode(input: string) {
    if (input) {
      this.author = input.toLowerCase() === 'true';
    }
  }
}
