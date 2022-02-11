import {  JobPosition, JWeight, OfficeRole } from 'corp/libCorporation'

export class IndustryInfo {
    constructor(readonly industry: string) {
    }

    getWeights(role: OfficeRole): JWeight[] {
        if (role==OfficeRole.Research) {
            return [ { position: JobPosition.RandD, weight: 1 } ];
        } else if (role==OfficeRole.Manufacturing) {
            return [ 
                { position: JobPosition.Operations, weight: 0.1 }, 
                { position: JobPosition.Engineer, weight: 0.1 }, 
                { position: JobPosition.Management, weight: 0.1 }, 
                { position: JobPosition.Business, weight: 0.1 }, 
                { position: JobPosition.RandD, weight: 0.6 }, 
            ];
        } else {
            if (this.industry=="Tobacco") {
                return [ 
                    { position: JobPosition.Operations, weight: 0.032 }, 
                    { position: JobPosition.Engineer, weight: 0.054 }, 
                    { position: JobPosition.Management, weight: 0.056 }, 
                    { position: JobPosition.Business, weight: 0.054 }, 
                    { position: JobPosition.RandD, weight: 0.05 } 
                ];        
            } else if (this.industry=="Healthcare") {
                return [ 
                    { position: JobPosition.Operations, weight: 0.028 }, 
                    { position: JobPosition.Engineer, weight: 0.051 }, 
                    { position: JobPosition.Management, weight: 0.046 }, 
                    { position: JobPosition.Business, weight: 0.037 }, 
                    { position: JobPosition.RandD, weight: 0.034 }
                ];   
            } else if (this.industry=="Software") {
                return [ 
                    { position: JobPosition.Operations, weight: 0.024 }, 
                    { position: JobPosition.Engineer, weight: 0.034 }, 
                    { position: JobPosition.Management, weight: 0.03 }, 
                    { position: JobPosition.Business, weight: 0.03 }, 
                    { position: JobPosition.RandD, weight: 0.03 }
                ];            
            } else {
                return [ 
                    { position: JobPosition.Operations, weight: 0.2 }, 
                    { position: JobPosition.Engineer, weight: 0.2 }, 
                    { position: JobPosition.Management, weight: 0.2 }, 
                    { position: JobPosition.Business, weight: 0.2 }, 
                    { position: JobPosition.RandD, weight: 0.2 } 
                ];            
            }

        }
    }
    
    listMaterials(): string[] {
        if (this.industry=="Agriculture") {
            return ["Food", "Plants"];
        } else {
            return [];
        }
    }
}
