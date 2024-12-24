import { Component, ElementRef, Input, OnInit, QueryList, ViewChild, ViewChildren } from '@angular/core';
import { DomSanitizer } from '@angular/platform-browser';
import { SoftwareDownloadService } from '@software-delivery/services/software-download/software-download.service';
import { UserInfo } from '@software-delivery/components/model/user-info';
import { SoftwareTableComponent } from '../software-table/software-table.component';


@Component({
  selector: 'app-software-download',
  templateUrl: './software-download.component.html',
  styleUrls: ['./software-download.component.scss']
})
export class SoftwareDownloadComponent implements OnInit {
  availableDownloads = [];
  appliedFilterList = [];
  platformFilters = [];
  languageFilters = [];
  useShortLiveUrl = false;
  modalDownloadRequest = '';
  data: any;
  termsAccepted = true;
  availableRowStart: number;
  availableRowEnd: number;
  showLoadMore = false;
  searchTerm = '';
  filtersApplied = false;
  filterData = {
    language: [],
    platform: []
  };
  userData = {
    phone: '',
    zipCode: '',
    country: '',
    company: '',
    address: '',
    city: '',
    relationshipWithEaton: '',
    acceptSubmittingTerms: false,
  };
  formControls: any;
  submitted: boolean;
  countryList = [];
  relationShipList = [];
  tnCText: any;
  softwareType = '';
  partNumber = '';
  showSpinner = false;
  limit: number;
  searchMode = false;
  noResults = false;
  itemToDownload: any;
  eloquaFormVar = {
    softwarePathVar: 'softwarePath',
    eloquaFormFirstNameVar: 'C_FirstName',
    eloquaFormLastNameVar: 'C_LastName',
    eloquaFormEmailVar: 'C_EmailAddress',
  }
  @Input()
  author: string;
  userInfo: UserInfo = { firstname: '', lastname: '', email: '' };

  @ViewChildren('platformCheck') platformCheck: QueryList<ElementRef>;
  @ViewChildren('languageCheck') languageCheck: QueryList<ElementRef>;
  @ViewChild(SoftwareTableComponent) softwareTableComponent: any;
  constructor(private softwareDownloadService: SoftwareDownloadService, private sanitized: DomSanitizer,
    private downloadService: SoftwareDownloadService) { }

  ngOnInit(): void {
    this.showSpinner = true;
    if (this.data.override && this.data.override.softwareType !== '' && this.data.override.partNumbers) {
      this.softwareType = this.data.override.softwareType;
      this.partNumber = this.data.override.partNumbers.join(',');
    }
    this.availableRowStart = 1;
    this.availableRowEnd = this.data.loadingCount;
    for (const value of this.data.relationWithEatonDD) {
      this.relationShipList.push(Object.keys(value));
    }
    for (const value of this.data.countries) {
      this.countryList.push(Object.keys(value));
    }
    const downloadElement = document.querySelectorAll('etn-software-download')
    this.tnCText = this.sanitized.bypassSecurityTrustHtml(this.data.i18n.requestDownloadModalText);
    this.softwareDownloadService.getAvailableDownloads(this.availableRowStart, this.availableRowEnd,
      this.partNumber, this.softwareType).subscribe(
        res => {
          this.userInfo = res.userInfo;
          this.useShortLiveUrl = res.useShortLivedUrl;
          if (res.packages.length > 0) {
            this.availableDownloads = res.packages.filter(pkg => this.isShowCOndition(pkg));
            downloadElement.forEach(de => {
              de.closest('.panel')?.classList.remove('hide')
            })
            this.createFilters(res.filters);
            if (this.availableDownloads.length === Number(res['total-count'])) {
              this.showLoadMore = false;
            } else {
              this.showLoadMore = true;
            }
          } else {
            if (!this.isAuthorEnv()) {
              downloadElement.forEach(de => {
                de.closest('.panel')?.classList.add('hide')
              })
            }
          }
          this.showSpinner = false;
        },
        err => {
          if (!this.isAuthorEnv()) {
            downloadElement.forEach(de => {
              de.closest('.panel')?.classList.add('hide')
            });
          }
          this.showSpinner = false;
        }
      );
  }
    isShowCOndition(pkg: any): boolean {
    const today = new Date();
    const expirationDate = pkg.expiration_date ? this.parseDate(pkg.expiration_date) : null;
    const archiveDate = pkg.Archivedate ? this.parseDate(pkg.Archivedate) : null;
    if (!expirationDate && !archiveDate) {
      return true;
    }
    if (!expirationDate && archiveDate >= today) {
      return true;
    }
    if (!archiveDate && expirationDate >= today) {
      return true;
    }
    if (expirationDate >= today && archiveDate >= today) {
      return true;
    }
    return false;
  }
  parseDate(dateStr: string): Date {
    const [day, month, year] = dateStr.split('/').map(Number);
    return new Date(year, month - 1, day);
  }
  searchSoftwares() {
    if (this.searchTerm) {
      this.showSpinner = true;
      this.softwareDownloadService.searchSoftware(this.searchTerm.trim()).subscribe(
        resp => {
            this.availableDownloads = resp.packages;
            this.limit = resp['total-count'];
            this.showLoadMore = this.limit > this.availableDownloads.length;
            this.clearAllFilters();
            this.softwareTableComponent.appliedFilterList = [];
            this.softwareTableComponent.filtersApplied = false;
            this.createFilters(resp.filters);
            this.searchMode = true;
            this.noResults = false;
            this.showSpinner = false;
        }, err => {
          console.log(err);
          this.showSpinner = false;
        }
      )
    }
  }
  clearSearch() {
    this.ngOnInit()
    this.searchMode = false;
    this.searchTerm = ''
  }
  createFilters(filters: any) {
    filters.platform.forEach((item: any) => {
      if (!(this.filterData.platform.find(e => e.name === item))) {
        this.filterData.platform.push({ name: item, checked: false })
      }
    });
    filters.language.forEach((item: any) => {
      if (!(this.filterData.language.find(e => e.name === item))) {
        this.filterData.language.push({ name: item, checked: false })
      }
    });
  }
  clearAllFilters() {
    this.platformFilters.forEach(item => item.checked = false);
    this.languageFilters.forEach(lang => lang.checked = false);
    this.appliedFilterList = [];
    this.filtersApplied = false;
    this.filterData = {
      language: [],
      platform: []
    };
    this.platformCheck.forEach((element) => {
      element.nativeElement.checked = false;
    });
    this.languageCheck.forEach((element) => {
      element.nativeElement.checked = false;
    });
    const rows = document.querySelectorAll('.software-admin-search__table-row')
    rows.forEach(row => {
      row.classList.remove('hide')
    })
  }
  loadMoreAvailableDownloads() {
    this.availableRowStart = this.availableRowEnd + 1;
    this.availableRowEnd = this.availableRowEnd + this.data.loadingCount;
    this.softwareDownloadService.getAvailableDownloads(this.availableRowStart, this.availableRowEnd,
      this.partNumber, this.softwareType).subscribe(
        resp => {
          for (const value of resp.packages) {
            if (this.isShowCOndition(value)) {
                 this.availableDownloads.push(value);
               }
          }
          if (this.availableDownloads.length === Number(resp['total-count'])) {
            this.showLoadMore = false;
          } else {
            this.showLoadMore = true;
          }
        },
        error => {
        }
      )
  }
  requestDownloadAction(item) {
    this.itemToDownload = item;
    const formCollection: HTMLCollection = document.querySelector('div[slot="formbody"]').getElementsByTagName('form');
    let form: Element;
    if (formCollection.length > 0) {
      form = formCollection.item(0);
    }
    if (form) {
      this.setFormUserInformation(form);
      let storageUrlInput = form.getElementsByClassName(this.eloquaFormVar.softwarePathVar)[0];
      const storageUrl = new URL(item.storageUrl);
      if (!storageUrlInput) {
        storageUrlInput = document.createElement('input');
        storageUrlInput.setAttribute('type', 'hidden');
        storageUrlInput.setAttribute('name', this.eloquaFormVar.softwarePathVar);
        storageUrlInput.setAttribute('class', this.eloquaFormVar.softwarePathVar);
      }
      storageUrlInput.setAttribute('value', storageUrl.pathname);
      form.append(storageUrlInput);
    }
    const partNumberInput = document.getElementsByName('part_number');
    if (partNumberInput && partNumberInput.length > 0) {
      partNumberInput[0].setAttribute('value', item.revPartNumber);
    }
    this.modalDownloadRequest = 'show';
  }

  setFormUserInformation(form: Element) {
    const firstnameInput = form.querySelector(`input[name='${this.eloquaFormVar.eloquaFormFirstNameVar}']`);
    const lastnameInput = form.querySelector(`input[name='${this.eloquaFormVar.eloquaFormLastNameVar}']`);
    const emailInput = form.querySelector(`input[name='${this.eloquaFormVar.eloquaFormEmailVar}']`);
    if (firstnameInput) {
      firstnameInput.setAttribute('value', this.userInfo.firstname);
    }
    if (lastnameInput) {
      lastnameInput.setAttribute('value', this.userInfo.lastname);
    }
    if (emailInput) {
      emailInput.setAttribute('value', this.userInfo.email);
    }
  }

  closePopup() {
    this.modalDownloadRequest = '';
  }

  acceptTermsChanged(value) {
    if (value === 'no') {
      this.termsAccepted = false;
    } else {
      this.termsAccepted = true;
    }
  }

  onSubmit(value) {
    this.submitted = true;
    this.formControls = value.form.controls;
    if (!this.useShortLiveUrl) {
      window.location.href = this.itemToDownload.storageUrl;
    } else {
      const url: URL = new URL(this.itemToDownload.storageUrl);
      if (url) {
        const pathname = url.pathname;
        const assetType = this.itemToDownload.softwareType;
        const effectiveDate = this.itemToDownload.effective_date;
        const description = this.itemToDownload.packageName;
        this.downloadService.getDownloadLink(pathname, assetType, effectiveDate, description)
          .subscribe(payload => { window.location.href = payload.downloadPath });
      }
    }
    window.location.reload();
  }

  @Input()
  set json(input: string) {
    if (input) {
      this.data = JSON.parse(input);
    }
  }

  isAuthorEnv() {
    return this.author === 'true';
  }
}
